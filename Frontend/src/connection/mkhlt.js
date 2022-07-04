import React, { useEffect, useState, useRef } from 'react';
import Peer from "simple-peer";
import styled from "styled-components";
import ReactDOM from "react-dom";
import * as faceApi from "face-api.js";
import "./styles.css";
const socket = require('../connection/socket').socket



const expressionMap = {
  neutral: "😶",
  happy: "😄",
  sad: "😞",
  angry: "🤬",
  fearful: "😖",
  disgusted: "🤢",
  surprised: "😲"
};

class VideoChatApp extends React.Component {
  video = React.createRef();
  // partnerVideo = React.createRef();
  state = {
    expressions: [],
    stream :'',
    receivingCall: false,
    caller: '',
    callerSignal:'',
    callAccepted: false,
    isCalling: false,
    smileStatus: '3adi'
  };

  componentDidMount() {
    this.run();
  }

  // log = (...args) => {
  // //   console.log(...args);
  // };

  run = async () => {
    console.log("run started");
    try {
      await faceApi.nets.tinyFaceDetector.load("/models/");
      await faceApi.loadFaceExpressionModel(`/models/`);
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true, audio: true 
      });
      // this.setState({stream:})
      this.video.current.srcObject = this.mediaStream;

      socket.on("hey", (data) => {
        this.setState({receivingCall: true})
        this.setState({caller: data.from})
        this.setState({callerSignal: data.signal})

        // setReceivingCall(true);
        // setCaller(data.from);
        // setCallerSignal(data.signal);
      })

    } catch (e) {
      console.log(e);
      // this.log(e.name, e.message, e.stack);
    }
  };

  onPlay = async () => {
    if (
      this.video.current.paused ||
      this.video.current.ended ||
      !faceApi.nets.tinyFaceDetector.params
    ) {
      setTimeout(() => this.onPlay());
      return;
    }

    const options = new faceApi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.5
    });

    const result = await faceApi
      .detectSingleFace(this.video.current, options)
      .withFaceExpressions();

    if (result) {
      console.log(result);
      // this.log(result);
      const expressions = result.expressions.reduce(
        (acc, { expression, probability }) => {
          acc.push([expressionMap[expression], probability]);
          return acc;
        },
        []
      );
      // this.log(expressions);
      console.log(expressions);
      this.setState(() => ({ expressions }));
    }

    setTimeout(() => this.onPlay(), 1000);
  };

  callPeer(id) {
    this.setState({isCalling:true})
    // setIsCalling(true)
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: this.state.stream,
    });

    peer.on("signal", data => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: this.props.mySocketId })
    })

    peer.on("stream", stream => {
      if (this.partnerVideo.current) {
        this.partnerVideo.current.srcObject = stream;
      }
    });

    socket.on("callAccepted", signal => {
      this.setState({ callAccepted: true })
      // setCallAccepted(true);
      peer.signal(signal);
    })

  }

  acceptCall() {
    this.setState({ callAccepted: true });
    this.setState({ isCalling: false });

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: this.state.stream,
    });
    peer.on("signal", data => {
      socket.emit("acceptCall", { signal: data, to: this.state.caller })
    })

    peer.on("stream", stream => {
      this.state.partnerVideo.current.srcObject = stream;
    });

    peer.signal(this.state.callerSignal);
  }




  render() {
    return (
      <div className="App">
        <h1>Face Recognition Webcam</h1>
        <div>
          {this.state.expressions
            .sort((a, b) => b[1] - a[1])
            .filter((_, i) => i < 3)
            .map(([e, w]) => (
              <p key={e + w}>
                {e} {w}
              </p>
            ))}
        </div>
        <div style={{ width: "100%", height: "100vh", position: "relative" }}>
          <video
            ref={this.video}
            autoPlay
            muted
            onPlay={this.onPlay}
            style={{
              position: "absolute",
              width: "100%",
              height: "100vh",
              left: 0,
              right: 0,
              bottom: 0,
              top: 0
            }}
          />
        </div>
      </div>
    );
  }
}

export default VideoChatApp;