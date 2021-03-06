import axios from 'axios';
import cheerio from 'cheerio';
import queryString from 'query-string';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import AutoCompleteText from './AutoCompleteText';
import {socket} from "../../socket";

import "./Queue.css";
import QueueList from './QueueList';
function Queue() {
  const [showError, setShowError] = useState(false);
  const [error, setError] = useState('');
  const values = queryString.parse(window.location.hash);
  const [songs, setSongs] = useState([]);
  const [textField, setTextField] = useState('');
  const [queueList, setQueueList] = useState([]);
  const [name, setName] = useState([]);
  const[userNumber, setUserNumber] = useState();
  let history = useHistory();
 
 

  useEffect(()=>{
    socket.on('userUpdate', number =>  setUserNumber(number));
    socket.on('broadcastQueue', queueItem=>{
      console.log("Broadcasted!");
      setQueueList(prevQueueList => [queueItem, ...prevQueueList]); 
      const queryURL = queryString.stringifyUrl({ url: "https://api.spotify.com/v1/me/player/queue", query: { uri: queueItem.uri } })
      axios.post(queryURL, null, {
        headers: {
          'Authorization': 'Bearer ' + values.access_token
        }
      })
        .then(res => "Successfuly added")
        .catch(err =>{
          if(err.response.status == 401){
            history.push('/');
         }
        })
  
  
    });
    axios.get("https://api.spotify.com/v1/me",{
      headers:{
        'Authorization': 'Bearer '+ values.access_token
      }
    })
    .then(res=>{
      if(res.data.display_name == null){
        setName('Anonymous');
      }else{
        setName(res.data.display_name);
      }
    })
    .catch(err=>{
     if(err.response.status == 401){
        history.push('/');
     }
    })
  
    return () => socket.disconnect();
  },[]);


  const addToQueue = queueItem => {

    

  }

  async function getRandomHit() {
    const proxyurl = "https://api.allorigins.win/raw?url=";
    const url = "https://www.billboard.com/charts/hot-100";

    const response = await axios.get(proxyurl + url)

    var rndSong = null;
    //handling the success
    const html = response.data;

    //loading response data into a Cheerio instance
    const $ = cheerio.load(html);

    //selecting the data

    //Songs names
    var topSongs = [];
    $("ol[class='chart-list__elements']")
      .find(
        "span[class='chart-element__information__song text--truncate color--primary']"
      )
      .each(function (i, element) {
        topSongs.push(element.children[0].data);
      });

    //Artists names
    var artists = [];
    $("ol[class='chart-list__elements']")
      .find(
        "span[class='chart-element__information__artist text--truncate color--secondary']"
      )
      .each(function (i, element) {
        artists.push(element.children[0].data);
      });

    //get the artist and song randomly
    var pos = Math.floor(Math.random() * 101);

    rndSong = { artist: artists[pos], song: topSongs[pos] };

    return rndSong;

  }

  const updateList = e => {
    setShowError(false);
    setTextField(e.target.value);
    const queryURL = queryString.stringifyUrl({ url: 'https://api.spotify.com/v1/search', query: { q: e.target.value, type: 'track' } });
    axios.get(queryURL, {
      headers: {
        'Authorization': 'Bearer ' + values.access_token
      }
    })
      .then(res => {
        const items = res.data.tracks.items;
        const songList = []
        items.forEach(element => {
          songList.push({ name: element.name + " by " + element.artists[0].name, uri: element.uri })
        });
        setSongs(songList);
      })
      .catch(err => {
        if(err.response.status == 401){
          history.push('/');
       }
        setSongs([]);
      })
  };


  function songSelected(selectedItem) {
    setTextField(selectedItem.uri);
    setSongs([]);
  }

  const clearSongs = () => {
    setSongs([]);
  }

  const queueSong = () => {
    const uri=textField;
    const queryURL = queryString.stringifyUrl({ url: "https://api.spotify.com/v1/me/player/queue", query: { uri: textField } })
    axios.post(queryURL, null, {
      headers: {
        'Authorization': 'Bearer ' + values.access_token
      }
    })
      .then(res => {
       
        axios.get('https://api.spotify.com/v1/tracks/'+ textField.substring(14),{
          headers:{
            'Authorization': 'Bearer ' + values.access_token
          }
        })
        .then(res=>{
          const queueItem = {
            artist:res.data.artists[0].name,
            track:res.data.name,
            image:res.data.album.images[res.data.album.images.length-1].url,
            name: name,
            uri:uri
          }
          socket.emit('addQueue', queueItem);
          setQueueList(prevQueueList => [queueItem, ...prevQueueList]); 
        })

        setTextField('');
      })
      .catch(err => {
        if(err.response.status == 401){
          history.push('/');
       }
        setError(err.response.data.error.message);
        setShowError(true);
      })

  }

  const queueRandomSong = async () => {
    const result = await getRandomHit();
    setShowError(false);
    const queryURL = queryString.stringifyUrl({ url: 'https://api.spotify.com/v1/search', query: { q: result.song, type: 'track' } });
    axios.get(queryURL, {
      headers: {
        'Authorization': 'Bearer ' + values.access_token
      }
    })
      .then(res => {
        const uri = res.data.tracks.items[0].uri;
        const queryURL = queryString.stringifyUrl({ url: "https://api.spotify.com/v1/me/player/queue", query: { uri: res.data.tracks.items[0].uri } })
         const queueItem = {
          artist:res.data.tracks.items[0].artists[0].name,
          track:res.data.tracks.items[0].name,
          image:res.data.tracks.items[0].album.images[res.data.tracks.items[0].album.images.length-1].url,
          name: name,
          uri: uri
        };
        axios.post(queryURL, null, {
          headers: {
            'Authorization': 'Bearer ' + values.access_token
          }
        })
          .then(res => {
            console.log("Sucessfully Added");
            socket.emit('addQueue', queueItem);
            setQueueList(prevQueueList => [queueItem, ...prevQueueList]); 
           
          })
          .catch(err => {
           if(err.response.status == 401){
              history.push('/');
           }
            console.log(err.response.data);
            setError(err.response.data.error.message);
            setShowError(true);
            console.log(err)
          })
       
      })
      .catch(err=>{
        if(err.response.status == 401){
          history.push('/');
       }
        console.log(err);
      });


  }
  return (
    <div className="queue-page">
      <div className="queue-container">
        <div className="title-container">
          <h1>Welcome to the Queue!</h1>
          <label className="listener-text">{userNumber} {userNumber==1? 'person' : 'people'} exploring new music together</label>
        </div>
        <QueueList queueList={queueList}/>
        <div className="information-container">
          <div className="form-container">
            <AutoCompleteText textField={textField} updateList={updateList} songSelected={songSelected} songs={songs} clearSongs={clearSongs} />
            {showError && <label className="error-label">{error}</label>}
            <input className="add-button" type="button" value="Share with the world" onClick={queueSong} />
            <input className="random-button" type="button" value="Queue a random song" onClick={queueRandomSong} />
          </div>
        </div>
      </div>

    </div>
  );

}

export default Queue;

