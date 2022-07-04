import React from 'react'
import Game from '../model/chess'
import Square from '../model/square'
import { Stage, Layer } from 'react-konva';
import Board from '../assets/chessBoard.png'
import useSound from 'use-sound'
import chessMove from '../assets/moveSoundEffect.mp3'
import Piece from './piece'
import piecemap from './piecemap'
import { useParams } from 'react-router-dom'
import { ColorContext } from '../../context/colorcontext'
import VideoChatApp from '../../connection/videochat'
import YouTube from 'react-youtube' // ztha
const socket = require('../../connection/socket').socket


class ChessGame extends React.Component {


    state = {
        gameState: new Game(this.props.color),
        draggedPieceTargetId: "", // empty string means no piece is being dragged
        playerTurnToMoveIsWhite: true,
        whiteKingInCheck: false,
        blackKingInCheck: false,

    }


    componentDidMount() {
        console.log(this.props.myUserName)
        console.log(this.props.opponentUserName)
        // register event listeners
        socket.on('opponent move', move => {
            // move == [pieceId, finalPosition]
            // console.log("opponenet's move: " + move.selectedId + ", " + move.finalPosition)
            if (move.playerColorThatJustMovedIsWhite !== this.props.color) {
                this.movePiece(move.selectedId, move.finalPosition, this.state.gameState, false)
                this.setState({
                    playerTurnToMoveIsWhite: !move.playerColorThatJustMovedIsWhite
                })
            }
        })

        // // ztha
        // socket.on('opponent msg', move => {
        //     // move == [pieceId, finalPosition]
        //     // console.log("opponenet's move: " + move.selectedId + ", " + move.finalPosition)
        //     console.log("msg")

        // })
    }

    startDragging = (e) => {
        this.setState({
            draggedPieceTargetId: e.target.attrs.id
        })
    }


    movePiece = (selectedId, finalPosition, currentGame, isMyMove) => {
        /**
         * "update" is the connection between the model and the UI. 
         * This could also be an HTTP request and the "update" could be the server response.
         * (model is hosted on the server instead of the browser)
         */
        var whiteKingInCheck = false
        var blackKingInCheck = false
        var blackCheckmated = false
        var whiteCheckmated = false
        const update = currentGame.movePiece(selectedId, finalPosition, isMyMove)

        if (update === "moved in the same position.") {
            this.revertToPreviousState(selectedId) // pass in selected ID to identify the piece that messed up
            return
        } else if (update === "user tried to capture their own piece") {
            this.revertToPreviousState(selectedId)
            return
        } else if (update === "b is in check" || update === "w is in check") {
            // change the fill of the enemy king or your king based on which side is in check. 
            // play a sound or something
            if (update[0] === "b") {
                blackKingInCheck = true
            } else {
                whiteKingInCheck = true
            }
        } else if (update === "b has been checkmated" || update === "w has been checkmated") {
            if (update[0] === "b") {
                blackCheckmated = true
            } else {
                whiteCheckmated = true
            }
        } else if (update === "invalid move") {
            this.revertToPreviousState(selectedId)
            return
        }

        // let the server and the other client know your move
        if (isMyMove) {
            socket.emit('new move', {
                nextPlayerColorToMove: !this.state.gameState.thisPlayersColorIsWhite,
                playerColorThatJustMovedIsWhite: this.state.gameState.thisPlayersColorIsWhite,
                selectedId: selectedId,
                finalPosition: finalPosition,
                gameId: this.props.gameId
            })
            // socket.emit('new msg', {
            //     nextPlayerColorToMove: !this.state.gameState.thisPlayersColorIsWhite,
            //     playerColorThatJustMovedIsWhite: this.state.gameState.thisPlayersColorIsWhite,
            //     selectedId: selectedId,
            //     finalPosition: finalPosition,
            //     gameId: this.props.gameId
            // })
        }


        this.props.playAudio()

        // sets the new game state. 
        this.setState({
            draggedPieceTargetId: "",
            gameState: currentGame,
            playerTurnToMoveIsWhite: !this.props.color,
            whiteKingInCheck: whiteKingInCheck,
            blackKingInCheck: blackKingInCheck
        })

        if (blackCheckmated) {
            alert("WHITE WON BY CHECKMATE!")
        } else if (whiteCheckmated) {
            alert("BLACK WON BY CHECKMATE!")
        }
    }


    endDragging = (e) => {
        const currentGame = this.state.gameState
        const currentBoard = currentGame.getBoard()
        const finalPosition = this.inferCoord(e.target.x() + 90, e.target.y() + 90, currentBoard)
        const selectedId = this.state.draggedPieceTargetId
        this.movePiece(selectedId, finalPosition, currentGame, true)
    }

    revertToPreviousState = (selectedId) => {
        /**
         * Should update the UI to what the board looked like before. 
         */
        const oldGS = this.state.gameState
        const oldBoard = oldGS.getBoard()
        const tmpGS = new Game(true)
        const tmpBoard = []

        for (var i = 0; i < 8; i++) {
            tmpBoard.push([])
            for (var j = 0; j < 8; j++) {
                if (oldBoard[i][j].getPieceIdOnThisSquare() === selectedId) {
                    tmpBoard[i].push(new Square(j, i, null, oldBoard[i][j].canvasCoord))
                } else {
                    tmpBoard[i].push(oldBoard[i][j])
                }
            }
        }

        // temporarily remove the piece that was just moved
        tmpGS.setBoard(tmpBoard)

        this.setState({
            gameState: tmpGS,
            draggedPieceTargetId: "",
        })

        this.setState({
            gameState: oldGS,
        })
    }


    inferCoord = (x, y, chessBoard) => {
        // console.log("actual mouse coordinates: " + x + ", " + y)
        /*
            Should give the closest estimate for new position. 
        */
        var hashmap = {}
        var shortestDistance = Infinity
        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 8; j++) {
                const canvasCoord = chessBoard[i][j].getCanvasCoord()
                // calculate distance
                const delta_x = canvasCoord[0] - x
                const delta_y = canvasCoord[1] - y
                const newDistance = Math.sqrt(delta_x ** 2 + delta_y ** 2)
                hashmap[newDistance] = canvasCoord
                if (newDistance < shortestDistance) {
                    shortestDistance = newDistance
                }
            }
        }

        return hashmap[shortestDistance]
    }

    render() {
        // console.log(this.state.gameState.getBoard())
        //  console.log("it's white's move this time: " + this.state.playerTurnToMoveIsWhite)
        /*
            Look at the current game state in the model and populate the UI accordingly
        */
        // console.log(this.state.gameState.getBoard())

        return (
            <React.Fragment>
                <div style={{
                    backgroundImage: `url(${Board})`,
                    width: "720px",
                    height: "720px"
                }}
                >
                    <Stage width={720} height={720}>
                        <Layer>
                            {this.state.gameState.getBoard().map((row) => {
                                return (<React.Fragment>
                                    {row.map((square) => {
                                        if (square.isOccupied()) {
                                            return (
                                                <Piece
                                                    x={square.getCanvasCoord()[0]}
                                                    y={square.getCanvasCoord()[1]}
                                                    imgurls={piecemap[square.getPiece().name]}
                                                    isWhite={square.getPiece().color === "white"}
                                                    draggedPieceTargetId={this.state.draggedPieceTargetId}
                                                    onDragStart={this.startDragging}
                                                    onDragEnd={this.endDragging}
                                                    id={square.getPieceIdOnThisSquare()}
                                                    thisPlayersColorIsWhite={this.props.color}
                                                    playerTurnToMoveIsWhite={this.state.playerTurnToMoveIsWhite}
                                                    whiteKingInCheck={this.state.whiteKingInCheck}
                                                    blackKingInCheck={this.state.blackKingInCheck}
                                                />)
                                        }
                                        return
                                    })}
                                </React.Fragment>)
                            })}
                        </Layer>
                    </Stage>
                </div>
            </React.Fragment>)
    }
}
// begin class for player video youtube link 

class YoutubePlayerLink extends React.Component {

    videoOnReady(event) {
        // access to player in all event handlers via event.target
        event.target.playVideo();
        // console.log(event.target)
    }

    render() {
        const opts = {
            height: '390',
            width: '640',
            playerVars: {
                // https://developers.google.com/youtube/player_parameters
                autoplay: 1,
                end: 5,// chhal mn second ghadi ikhdm
                controls:0,
                rel:0,
                // showinfo:0,
                disablekb :1,
                // enablejsapi :0
                 
            },
        };
        const { videoId } = this.props
        return (
            <div id='disableClickk'>
                <YouTube
                    videoId={videoId}
                    opts={opts}
                    onReady={this.videoOnReady} 
                    onStateChange ={this.videoOnReady} // ztha
                    
                    />
            </div>

        )
    }


}

// end of class player

// fonction to use class player video link
function ShowVideoPLayer(props) {
    const kaynLien = props.condShow;
    if (kaynLien == true) {

        return (
            // <YoutubePlayerLink videoId={props.videoId}/> 
            <div> {<YoutubePlayerLink videoId={props.videoId} />} </div>
        )
    } else {
        return <h2>makaynch</h2>
    }
}

// i added this function for chatting 

class EssayForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            // value: 'Écrivez un essai à propos de votre élément du DOM préféré'
            value: '',
            showVideo: false
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    componentDidMount() {
        // // // ztha
        //  this.setState({showVideo: true});
        socket.on('opponent msg', msg => {
            // move == [pieceId, finalPosition]
            // console.log("opponenet's move: " + move.selectedId + ", " + move.finalPosition)
            console.log("msg")
            this.setState({ value: msg.messageShow });
            this.setState({ showVideo: true });

        })

    }

    // handleVideoshow() {
    //     this.setState({showVideo: true});
    //   }

    handleChange(event) {
        this.setState({ value: event.target.value });
        //   this.setState({showVideo: true});
    }

    handleSubmit(event) {

        //   alert('Un essai a été envoyé : ' + this.state.value);
        this.setState({ showVideo: true });
        event.preventDefault();
        socket.emit('new msg', {
            messageShow: this.state.value,
            gameId: this.props.gameId
        })
    }


    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <label>
                    Essay:
                    <textarea value={this.state.value} onChange={this.handleChange} />
                </label>
                <input type="submit" value="Envoyer" />
                <div>
                    <ShowVideoPLayer videoId={this.state.value} condShow={this.state.showVideo} />
                </div>
            </form>

        );
    }
}


// end of function of chattging



const ChessGameWrapper = (props) => {
    /**
     * player 1
     *      - socketId 1
     *      - socketId 2 ???
     * player 2
     *      - socketId 2
     *      - socketId 1
     */



    // get the gameId from the URL here and pass it to the chessGame component as a prop. 
    const domainName = 'http://localhost:3000'
    const color = React.useContext(ColorContext)
    const { gameid } = useParams()
    const [play] = useSound(chessMove);
    const [opponentSocketId, setOpponentSocketId] = React.useState('')
    const [opponentDidJoinTheGame, didJoinGame] = React.useState(false)
    const [opponentUserName, setUserName] = React.useState('')
    const [gameSessionDoesNotExist, doesntExist] = React.useState(false)
    //  i added this
    const [opponentchat, setchat] = React.useState('')

    React.useEffect(() => {
        socket.on("playerJoinedRoom", statusUpdate => {
            console.log("A new player has joined the room! Username: " + statusUpdate.userName + ", Game id: " + statusUpdate.gameId + " Socket id: " + statusUpdate.mySocketId)
            if (socket.id !== statusUpdate.mySocketId) {
                setOpponentSocketId(statusUpdate.mySocketId)
            }
        })

        socket.on("status", statusUpdate => {
            console.log(statusUpdate)
            alert(statusUpdate)
            if (statusUpdate === 'This game session does not exist.' || statusUpdate === 'There are already 2 people playing in this room.') {
                doesntExist(true)
            }
        })


        socket.on('start game', (opponentUserName) => {
            console.log("START!")
            if (opponentUserName !== props.myUserName) {
                setUserName(opponentUserName)
                didJoinGame(true)
            } else {
                // in chessGame, pass opponentUserName as a prop and label it as the enemy. 
                // in chessGame, use reactContext to get your own userName
                // socket.emit('myUserName')
                socket.emit('request username', gameid)
            }
        })


        socket.on('give userName', (socketId) => {
            if (socket.id !== socketId) {
                console.log("give userName stage: " + props.myUserName)
                socket.emit('recieved userName', { userName: props.myUserName, gameId: gameid })
            }
        })

        socket.on('get Opponent UserName', (data) => {
            if (socket.id !== data.socketId) {
                setUserName(data.userName)
                console.log('data.socketId: data.socketId')
                setOpponentSocketId(data.socketId)
                didJoinGame(true)
            }
        })

        // ztha
        // ztha
        // socket.on('opponent msg', newMsg => {
        //     // move == [pieceId, finalPosition]
        //     // console.log("opponenet's move: " + move.selectedId + ", " + move.finalPosition)
        //     console.log(122)
        //     setchat(newMsg.aa)

        // })

        // I add this for chat 

        // var messages = document.getElementById('messages');
        // var form = document.getElementById('form');
        // var input = document.getElementById('input');

        // if (form) {

        // form.addEventListener('submit', function (e) {
        //     e.preventDefault();
        //     if (input.value) {
        //         socket.emit('new move', input.value);
        //         input.value = '';
        //     }
        // });
        // }


        // socket.on('chat message', function (msg) {
        //     var item = document.createElement('li');
        //     item.textContent = msg;
        //     messages.appendChild(item);
        //     window.scrollTo(0, document.body.scrollHeight);
        // });


        // end of chat added


    }, [])



    return (
        <React.Fragment>
            {opponentDidJoinTheGame ? (
                <div>
                    <h4> Opponent: {opponentUserName} </h4>
                    <div style={{ display: "flex" }}>
                        {/* <ChessGame
                            playAudio={play}
                            gameId={gameid}
                            color={color.didRedirect}
                        /> */}
                        <VideoChatApp
                            mySocketId={socket.id}
                            opponentSocketId={opponentSocketId}
                            myUserName={props.myUserName}
                            opponentUserName={opponentUserName}
                        />

                        {/* i added this class for messaging */}
                        <EssayForm
                            gameId={gameid}
                            opponentSocketId={opponentSocketId}
                        />


                        {/* end of class chatting */}


                    </div>
                    <h4> You: {props.myUserName} </h4>
                    {/* Begin of chat part  */}

                    <h4> chat: {opponentchat} </h4>
                    <input type="text" value={opponentchat} />
                    {/* <input type="submit" value="Envoyer" onChange={event => <Welcome msg = {event.target.value}   gameId={gameid}/>} />  */}
                    {/* <input type="text" value={opponentchat} onChange={event => setchat(event.target.value)} /> */}
                    {/* <input type="submit" value="Envoyer" onChange={event => socket.emit('new msg',{opponentSocketId:opponentSocketId, aa:event.target.value})} />  */}

                    {/* <ul id="messages"></ul>
                    <form id="form" action="">
                        <input id="input" onChange={event => socket.emit('new move',event.target.value)} /><button>Send</button>
                    </form> */}



                    {/* <div id="chatt">
                        <ul id="messages"></ul>
                        <form id="form" action="">
                            <input id="input" autocomplete="off" /><button>Send</button>
                        </form>
                    </div> */}
                    {/* end of chat part*/}
                </div>
            ) : gameSessionDoesNotExist ? (
                <div>
                    <h1 style={{ textAlign: "center", marginTop: "200px" }}> :( </h1>
                </div>
            ) : (
                <div>
                    <h1
                        style={{
                            textAlign: "center",
                            marginTop: String(window.innerHeight / 8) + "px",
                        }}
                    >
                        Salam <strong>{props.myUserName}</strong>, Envoyer le lien a votre amie :
                    </h1>
                    <textarea
                        style={{ marginLeft: String((window.innerWidth / 2) - 290) + "px", marginTop: "30" + "px", width: "580px", height: "30px" }}
                        onFocus={(event) => {
                            console.log('sd')
                            event.target.select()
                        }}
                        value={domainName + "/game/" + gameid}
                        type="text">
                    </textarea>
                    <br></br>

                    <h1 style={{ textAlign: "center", marginTop: "100px" }}>
                        {" "}
                         Attend votre amie a entre ...{" "}
                    </h1>
                </div>


            )}
        </React.Fragment>
    );
};

export default ChessGameWrapper
