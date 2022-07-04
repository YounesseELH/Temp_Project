import React, { useEffect, useState, useRef } from 'react';
import Peer from "simple-peer";
import styled from "styled-components";
// import SmilesStatus from './SmilaStatusClass';// ztha
import * as faceapi from 'face-api.js';
const socket = require('../connection/socket').socket



const Container = styled.div`
  height: 100vh;
  width: 100%;
  flex-direction: column;
`;

const Row = styled.div`
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid blue;
`;





// la fin 


function VideoChatApp(props) {
  //z1

  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  const [captureVideo, setCaptureVideo] = React.useState(false);
  const canvasRef = React.useRef();
  const videoHeight = '50%';
  const videoWidth = '50%';

  // zend

  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [isCalling, setIsCalling] = useState(false)
  const userVideo = useRef();
  const partnerVideo = useRef();
  const [smileStatus, setSmileStatus] = useState("3adi")

  //z1
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]).then(setModelsLoaded(true));
    }
    loadModels();
  }, []);
  //enz

  useEffect(() => {


    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {

      setStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;

        // hna anzit la fonction dyal detection

        // hna salat fonction dyal detection
      }
    })


    socket.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    })
  }, []);

  function refreshStateJ() {


  }






  // la fin 

  function callPeer(id) {
    setIsCalling(true)
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", data => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: props.mySocketId })
    })

    peer.on("stream", stream => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    socket.on("callAccepted", signal => {
      setCallAccepted(true);
      peer.signal(signal);
    })

  }

  function acceptCall() {
    setCallAccepted(true);
    setIsCalling(false)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", data => {
      socket.emit("acceptCall", { signal: data, to: caller })
    })

    peer.on("stream", stream => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
  }

  let UserVideo;
  if (stream) {
    UserVideo = (
      <Video playsInline muted ref={userVideo} autoPlay style={{ width: "50%", height: "50%" }} />
      // <h1>jj</h1>
    );
  }

  let mainView;

  if (callAccepted) {
    mainView = (
      <Video playsInline ref={partnerVideo} autoPlay onPlay={handleVideoOnPlay} style={{ width: "100%", height: "100%" }} />
    );
  } else if (receivingCall) {
    mainView = (
      <div>
        <h1>{props.opponentUserName} is calling you</h1>
        <button onClick={acceptCall}><h1>Accept</h1></button>
      </div>
    )
  } else if (isCalling) {
    mainView = (
      <div>
        <h1>Currently calling {props.opponentUserName}...</h1>
      </div>
    )
  } else {
    mainView = (
      <button onClick={() => {
        callPeer(props.opponentSocketId)
      }}><h1>Chat with your friend while you play!</h1></button>
    )
  }
  // z1

  function isSmiling(expressions) {
    // filtering false positive
    const maxValue = Math.max(
      ...Object.values(expressions).filter(value => value <= 1)
    )
    const expressionsKeys = Object.keys(expressions)
    const mostLikely = expressionsKeys.filter(
      expression => expressions[expression] === maxValue
    )
    if (mostLikely[0] && mostLikely[0] == 'happy')
      return true
    return false
  }




  const handleVideoOnPlay = () => {
    setInterval(async () => {
      if (canvasRef && canvasRef.current) {
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(userVideo.current);
        const displaySize = {
          width: videoWidth,
          height: videoHeight
        }

        faceapi.matchDimensions(canvasRef.current, displaySize);
        const detections = await faceapi
          .detectAllFaces(userVideo.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions()
        if (detections && detections[0] && detections[0].expressions) {

          if (isSmiling(detections[0].expressions)) {
            // currentSmileStatus = true¨
            setSmileStatus("YOU SMILE !");
            console.log("YOU SMILE !");
            // document.getElementById("smileStatus").textContent = "YOU SMILE !"
          } else {
            setSmileStatus("not smiling");
            console.log("not smiling");
            // document.getElementById("smileStatus").textContent = "not smiling"
          }
        }

        // const detections = await faceapi.detectAllFaces(userVideo.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();

        // const resizedDetections = faceapi.resizeResults(detections, displaySize);
        // setSmileStatus(resizedDetections);
        // canvasRef && canvasRef.current && canvasRef.current.getContext('2d').clearRect(0, 0, videoWidth, videoHeight);
        // canvasRef && canvasRef.current && faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        // canvasRef && canvasRef.current && faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
        // canvasRef && canvasRef.current && faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
      }
    }, 100)
  }
  //endz



  return (<Container>
    <Row>
      {/* {mainView} */}
      <Video playsInline muted ref={userVideo} autoPlay onPlay={handleVideoOnPlay} height={videoHeight} width={videoWidth} />
      <canvas ref={canvasRef} style={{ position: 'absolute' }} />
      {/* {UserVideo} */}
    </Row>
    {/* <Row>
      {mainView}
      {UserVideo}
    </Row> */}
    <div>{smileStatus}</div>

  </Container>);
}


export default VideoChatApp;
