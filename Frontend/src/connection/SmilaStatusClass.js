import React from "react";
import ReactDOM from "react-dom";
import * as faceApi from "face-api.js";

import "./styles.css";


class SmilesStatus extends React.Component {
  video = React.createRef();

  state = { 
      expressions:'walo', };

  componentDidMount() {
    this.run();
  }

  log = (...args) => {
    console.log(...args);
  };

  run = async () => {
    this.log("run started");
    try {
      await faceApi.nets.tinyFaceDetector.load("/models/");
      await faceApi.loadFaceExpressionModel(`/models/`);
    //   this.mediaStream = await navigator.mediaDevices.getUserMedia({
    //     video: { facingMode: "user" }
    //   });

      this.video.current.srcObject = this.props.mediaStream;
    } catch (e) {
      this.log(e.name, e.message, e.stack);
      this.log('kayn chi ghalat')
    }
  };

  onPlay = async () => {

    const options = new faceApi.TinyFaceDetectorOptions({
      inputSize: 512,
      scoreThreshold: 0.5
    });

    const result = await faceApi
      .detectSingleFace(this.video.current, options)
      .withFaceExpressions();

    if (result) {
      this.log(result);
      const expressions = result.expressions.reduce(
        (acc, { expression, probability }) => {
            this.setState(() => ({ expressions }));
        },
        []
      );
      this.log(expressions);
      this.setState(() => ({ expressions }));
    }

    setTimeout(() => this.onPlay(), 1000);
  };

  render() {
    return (
      <div className="App">
        <h1>Face Recognition Webcam</h1>
        <h1> {this.state.expressions}</h1>
         
         
      </div>
    );
  }
}

export default SmilesStatus; 