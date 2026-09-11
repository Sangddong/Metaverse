const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];

export function createScreenShare({ socket, getYouId, getYouName, toast, onStateChange }) {
  let localStream = null;
  let screenShare = null; // { id, name } | null
  const publisherPcs = new Map(); // viewerId -> RTCPeerConnection
  let viewerPc = null;
  let viewerRemoteId = null;

  function isSharing() {
    return Boolean(localStream);
  }

  function iAmSharer() {
    const me = getYouId();
    return Boolean(screenShare && me && screenShare.id === me);
  }

  function emitStateUi() {
    onStateChange?.({
      screenShare,
      isSharing: isSharing(),
      iAmSharer: iAmSharer(),
    });
  }

  function setScreenShare(next) {
    const prev = screenShare;
    screenShare = next;
    if (!next) {
      closeViewerPc();
      if (prev && getYouId() === prev.id) {
        // already local stop handled elsewhere
      }
    }
    emitStateUi();
  }

  function closePublisherPcs() {
    for (const pc of publisherPcs.values()) {
      try {
        pc.close();
      } catch {
        /* ignore */
      }
    }
    publisherPcs.clear();
  }

  function closeViewerPc() {
    if (viewerPc) {
      try {
        viewerPc.close();
      } catch {
        /* ignore */
      }
    }
    viewerPc = null;
    viewerRemoteId = null;
  }

  function stopLocalTracks() {
    if (!localStream) return;
    for (const t of localStream.getTracks()) t.stop();
    localStream = null;
  }

  function discardLocalOnly() {
    closePublisherPcs();
    stopLocalTracks();
    emitStateUi();
  }

  async function startShare() {
    if (screenShare && !iAmSharer()) {
      toast(`${screenShare.name}님이 이미 화면을 공유 중입니다.`);
      return false;
    }
    if (isSharing()) return true;
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });
    } catch {
      toast("화면 공유를 시작하지 못했어요.");
      return false;
    }
    const [track] = localStream.getVideoTracks();
    if (track) {
      track.addEventListener("ended", () => {
        stopShare(true);
      });
    }
    socket.emit("screen:start");
    const me = getYouId();
    if (me) setScreenShare({ id: me, name: getYouName?.() || "나" });
    emitStateUi();
    return true;
  }

  function stopShare(fromTrackEnd = false) {
    if (!isSharing() && !iAmSharer()) return;
    closePublisherPcs();
    stopLocalTracks();
    if (!fromTrackEnd || iAmSharer()) socket.emit("screen:stop");
    emitStateUi();
  }

  function createPublisherPc(viewerId) {
    if (!localStream) return null;
    if (publisherPcs.has(viewerId)) {
      try {
        publisherPcs.get(viewerId).close();
      } catch {
        /* ignore */
      }
      publisherPcs.delete(viewerId);
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    publisherPcs.set(viewerId, pc);
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      socket.emit("screen:signal", {
        to: viewerId,
        data: { type: "ice", candidate: ev.candidate },
      });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        publisherPcs.delete(viewerId);
      }
    };
    return pc;
  }

  async function publishToViewer(viewerId) {
    const pc = createPublisherPc(viewerId);
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("screen:signal", {
      to: viewerId,
      data: { type: "offer", sdp: pc.localDescription },
    });
  }

  async function ensureViewerConnection(videoEl) {
    if (!screenShare) {
      toast("공유 중인 화면이 없어요.");
      return false;
    }
    if (iAmSharer()) {
      if (videoEl && localStream) {
        videoEl.srcObject = localStream;
        videoEl.muted = true;
        await videoEl.play().catch(() => {});
      }
      return true;
    }
    if (viewerPc && viewerRemoteId === screenShare.id && videoEl?.srcObject) {
      await videoEl.play().catch(() => {});
      return true;
    }
    closeViewerPc();
    viewerRemoteId = screenShare.id;
    viewerPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    viewerPc.ontrack = (ev) => {
      if (!videoEl) return;
      videoEl.srcObject = ev.streams[0] || new MediaStream([ev.track]);
      videoEl.play().catch(() => {});
    };
    viewerPc.onicecandidate = (ev) => {
      if (!ev.candidate || !viewerRemoteId) return;
      socket.emit("screen:signal", {
        to: viewerRemoteId,
        data: { type: "ice", candidate: ev.candidate },
      });
    };
    socket.emit("screen:watch");
    return true;
  }

  async function handleSignal({ from, data }) {
    if (!data?.type) return;
    if (data.type === "offer") {
      // Should not happen for publisher; viewers get offers
      if (!viewerPc || viewerRemoteId !== from) {
        closeViewerPc();
        viewerRemoteId = from;
        viewerPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        viewerPc.onicecandidate = (ev) => {
          if (!ev.candidate) return;
          socket.emit("screen:signal", {
            to: from,
            data: { type: "ice", candidate: ev.candidate },
          });
        };
      }
      const videoEl = document.getElementById("screenVideo");
      viewerPc.ontrack = (ev) => {
        if (!videoEl) return;
        videoEl.srcObject = ev.streams[0] || new MediaStream([ev.track]);
        videoEl.play().catch(() => {});
      };
      await viewerPc.setRemoteDescription(data.sdp);
      const answer = await viewerPc.createAnswer();
      await viewerPc.setLocalDescription(answer);
      socket.emit("screen:signal", {
        to: from,
        data: { type: "answer", sdp: viewerPc.localDescription },
      });
      return;
    }
    if (data.type === "answer") {
      const pc = publisherPcs.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(data.sdp);
      return;
    }
    if (data.type === "ice") {
      const pc = publisherPcs.get(from) || (viewerRemoteId === from ? viewerPc : null);
      if (!pc || !data.candidate) return;
      try {
        await pc.addIceCandidate(data.candidate);
      } catch {
        /* ignore */
      }
    }
  }

  socket.on("screen:state", (payload) => {
    const wasMine = iAmSharer();
    setScreenShare(payload);
    if (!payload) {
      closeViewerPc();
      const videoEl = document.getElementById("screenVideo");
      if (videoEl) videoEl.srcObject = null;
      if (wasMine || isSharing()) {
        closePublisherPcs();
        stopLocalTracks();
      }
      emitStateUi();
    }
  });

  socket.on("screen:viewer", ({ viewerId }) => {
    if (!isSharing() || !viewerId) return;
    publishToViewer(viewerId);
  });

  socket.on("screen:signal", (payload) => {
    handleSignal(payload);
  });

  return {
    startShare,
    stopShare,
    ensureViewerConnection,
    setScreenShare,
    getScreenShare: () => screenShare,
    isSharing,
    iAmSharer,
    emitStateUi,
    cleanup() {
      stopShare();
      closeViewerPc();
    },
    discardLocalOnly,
  };
}
