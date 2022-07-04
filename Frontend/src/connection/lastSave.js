import React, { useEffect, useState, useRef } from 'react';
import Peer from "simple-peer";
import styled from "styled-components";
// import SmilesStatus from './SmilaStatusClass';// ztha
import * as faceApi from "face-api.js";// ztha
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

// tzaad 
async function loadModels() {
  try {
    await faceApi.loadTinyFaceDetectorModel('/models')
    await faceApi.loadFaceExpressionModel('/models')
  } catch (e) {
    console.log(e.name, e.message, e.stack);
  }
}

function isSmiling(expressions) {
  // filtering false positive
  const maxValue = Math.max(
      ...Object.values(expressions).filter(value => value <= 1)
  )
  const expressionsKeys = Object.keys(expressions)
  const mostLikely = expressionsKeys.filter(
      expression => expressions[expression] === maxValue
  )
  if (mostLikely[0] && mostLikely[0] === 'happy')
      return true
  return false
}

// la fin 


function VideoChatApp(props) {
  /**
   * initial state: both player is neutral and have the option to call each other
   * 
   * player 1 calls player 2: Player 1 should display: 'Calling {player 2 username},' and the 
   *                          'CallPeer' button should disappear for Player 1.
   *                          Player 2 should display '{player 1 username} is calling you' and
   *                          the 'CallPeer' button for Player 2 should also disappear. 
   * 
   * Case 1: player 2 accepts call - the video chat begins and there is no button to end it.
   * 
   * Case 2: player 2 ignores player 1 call - nothing happens. Wait until the connection times out. 
   * 
   */

  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [isCalling, setIsCalling] = useState(false)
  const userVideo = useRef();
  const partnerVideo = useRef();
  const [smileStatus, setSmileStatus] = useState("3adi")


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

  // ztha 
  // useEffect(() => {
  //   async function loadModels() {
  //     try {
  //       await faceApi.nets.tinyFaceDetector.load("/models/");
  //       await faceApi.loadFaceExpressionModel(`/models/`);
  //     } catch (e) {
  //       console.log(e.name, e.message, e.stack);
  //       console.log('kayn chi ghalat')
  //     }
  //   }
  //   loadModels()
  // }, [])

  function refreshStateJ() {
    
    
  }

  // useEffect(() => {
  //   async function refreshState() {

  //     const options = new faceApi.TinyFaceDetectorOptions({
  //       inputSize: 512,
  //       scoreThreshold: 0.5
  //     });

  //     const result = await faceApi
  //       .detectSingleFace(stream, options)
  //       .withFaceExpressions();
  //     if (result) {
  //       setSmileStatus("expressions")
  //       // const expressions = result.expressions.reduce(
  //       //   (acc, { expression, probability }) => {
  //       //     setSmileStatus(expressions)
  //       //   },
  //       //   []
  //       // );

  //     }

  //   }

  //   refreshState()
  // }, [])







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
      // <Video playsInline muted ref={userVideo} autoPlay  style={{ width: "50%", height: "50%" }} />
      <h1>jj</h1>
    );
  }

  let mainView;

  if (callAccepted) {
    mainView = (
      <Video playsInline ref={partnerVideo} autoPlay style={{ width: "100%", height: "100%" }} />
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

  async function refreshState() {
    setInterval(async() => {
        const detections = await faceApi
            .detectAllFaces(stream, new faceApi.TinyFaceDetectorOptions())
            .withFaceExpressions()
        if (detections && detections[0] && detections[0].expressions) {
            // isUsingCamera = true
            if (isSmiling(detections[0].expressions)) {
                // currentSmileStatus = true
                setSmileStatus("YOU SMILE !")
            } else {
              setSmileStatus("not smiling")
            }
        }
    }, 400)
  }
  



  return (<Container>
    <Row>
      {/* {mainView} */}
      <Video playsInline muted ref={userVideo} autoPlay onPlay={refreshState()} style={{ width: "50%", height: "50%" }} />

      {UserVideo}
    </Row>
    <div>{smileStatus}</div>

  </Container>);
}


export default VideoChatApp;
