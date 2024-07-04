import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from "react-router-dom";
import './App.css';

const App = () => {
  const [showInput, setShowInput] = useState(false);
  const [showInput2, setShowInput2] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dataList, setDataList] = useState([]);
  const [recordingsList, setRecordingsList] = useState([]);
  const [stateIndex, setStateIndex] = useState(0);
  const [audioURL, setAudioURL] = useState('');
  const [latitude, setLatitude] = useState();
  const [longitude, setLongitude] = useState();
  const [userAddress, setUserAddress] = useState();
  const [gpslongitude, setgpsLongitude] = useState();
  const [gpslatitude, setgpsLatitude] = useState();
  const [recorder, setRecorder] = useState(null);
  const [email, setEmail] = useState(localStorage.getItem('email') || '');
  const [firstName, setFirstName] = useState(localStorage.getItem('firstName') || '');
  const [lastName, setLastName] = useState(localStorage.getItem('lastName') || '');

  useEffect(() => {
    fetchData();
    fetchRecordings();
    const geo = navigator.geolocation;
    if (geo) {
      geo.getCurrentPosition(userCoords, handleError);
      geo.watchPosition(userGPSCoords, handleError);
    } else {
      console.error("Geolocation is not supported by this browser.");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStateIndex(3);
    }
  }, [email]);

  useEffect(() => {
    localStorage.setItem('firstName', firstName);
    localStorage.setItem('lastName', lastName);
  }, [firstName, lastName]);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/data', {
        params: { email }
      });
      setDataList(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchRecordings = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/recordings', {
        params: { email }
      });
      setRecordingsList(response.data);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  const handleFirstNameChange = (e) => {
    setFirstName(e.target.value);
  };

  const handleLastNameChange = (e) => {
    setLastName(e.target.value);
  };

  const handleAddClick = () => {
    setShowInput(prevState => !prevState); 
  };

  const handleAddClick2 = () => {
    setShowInput2(prevState => !prevState); 
  };
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit2 = async (e) => {
    e.preventDefault();
    if (firstName.trim() === '' || lastName.trim() === '') {
      alert('Input field cannot be empty');
      return;
    }
    try {
      await axios.post('http://localhost:3000/api/add2', { email, firstName, lastName });
      setShowInput(false);
      alert('Data submitted successfully!');
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('Error submitting data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') {
      alert('Input field cannot be empty');
      return;
    }
    try {
      await axios.post('http://localhost:3000/api/add', { email, value: inputValue });
      setInputValue('');
      setShowInput(false);
      fetchData(); 
      alert('Data submitted successfully!');
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('Error submitting data');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/delete/${email}/${id}`);
      fetchData(); 
      alert('Data deleted successfully!');
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Error deleting data');
    }
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const navigateToNewDocument = () => {
    window.location.href = "new.html";
  };

  function userCoords(position) {
    const { latitude, longitude } = position.coords;
    setLatitude(latitude);
    setLongitude(longitude);
  }

  function userGPSCoords(position) {
    const { latitude, longitude } = position.coords;
    setgpsLatitude(latitude);
    setgpsLongitude(longitude);
  }

  function handleError(error) {
    console.error("Error occurred: ", error);
  }

  const recordAndSendSMS = async () => {
    try {
      await getUserAddress();
      const message = `Current location: ${userAddress}.I AM IN EMERGENGY! PLEASE HELP ME!!!!!!!!.`;
      const response = await axios.post("http://localhost:3000/sendSMS", {
        email,
        latitude,
        longitude,
        message
      });
      console.log(response.data);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      setRecorder(rec);

      const chunks = [];
      rec.ondataavailable = event => chunks.push(event.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const audioURL = URL.createObjectURL(blob);
        setAudioURL(audioURL);
        setStateIndex(2);

        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('email', email);
        await axios.post('http://localhost:3000/upload', formData);
        fetchRecordings();
      };

      rec.start();
      setStateIndex(1);
    } catch (error) {
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
    }
  };

  const getUserAddress = async () => {
    try {
      const url = `https://api.opencagedata.com/geocode/v1/json?key=YOUR_OPENCAGE_API_KEY&q=${latitude}%2C+${longitude}&pretty=1&no_annotations=1`;
      const response = await fetch(url);
      const data = await response.json();
      setUserAddress(data.results[0].formatted);
    } catch (error) {
      console.error("Error fetching user address: ", error);
    }
  };

  const downloadAudio = () => {
    const downloadLink = document.createElement('a');
    downloadLink.href = audioURL;
    downloadLink.setAttribute('download', 'audio');
    downloadLink.click();
  };

  const renderControls = () => {
    switch (stateIndex) {
      case 0:
        return <button className="emergency-button" onClick={recordAndSendSMS}>SEND EMERGENCY</button>;
      case 1:
        return (
          <>
            <p>Recording...</p>
            <button onClick={stopRecording}>Stop Recording</button>
          </>
        );
      case 2:
        return (
          <>
            <audio controls src={audioURL}></audio>
            <button onClick={downloadAudio}>Download Audio</button>
          </>
        );
      default:
        return <p>Your browser does not support mediaDevices</p>;
    }
  };

  return (
    <>
      <div><br></br>  <button className="know-emergency-button" onClick={navigateToNewDocument}>KNOW EMERGENCY NUMBERS</button>
       <h1 className="website-name">NIRBHAYA</h1><br></br>

      <div className="container">
    
     
  {firstName && <h2>Hi {firstName}, welcome!</h2>}
  <button className="logout-button" onClick={logout}>Logout</button>
  {/* <button className="know-emergency-button" onClick={navigateToNewDocument}>KNOW EMERGENCY NUMBERS</button> */}
</div>
<button className="emergency-button" onClick={recordAndSendSMS}>SEND EMERGENCY</button>
        <div className="controllers">
          
          {renderControls()}
        </div>
        <div><div ><button type="submit" onClick={handleAddClick2} className="edit-button">EDIT YOUR NAME AND PHONE NUMBER</button></div>
      {showInput2 && (  <form onSubmit={handleSubmit2}>
         
          <br></br>
            <input type="text" value={firstName} onChange={handleFirstNameChange} placeholder="First Name" />
            <input type="text" value={lastName} onChange={handleLastNameChange} placeholder="Your Phone Number" />
            <br></br>
            <br></br>
          
          </form>)}
          <br /><br />
         
          <br /><br />
          <div className="corner-buttons">
  <button onClick={handleAddClick}>+ Add contacts</button>
  {showInput && (
    
    <form onSubmit={handleSubmit}>
      
      <input type="text" value={inputValue} onChange={handleInputChange} />
      <button type="submit">Submit</button>
      <ul>
     
  {dataList.map((item) => (
    <li key={item._id}>
      {item.value}
      <button onClick={() => handleDelete(item._id)}>Delete</button>
    </li>
  ))}

</ul>
    </form>
  )}
</div>

 
          <h2>Recordings</h2>
          <ul>
            {recordingsList.map((recording) => (
              <li key={recording.fileName}>
                <audio controls src={`http://localhost:3000/recordings/${recording.fileName}`}></audio>
                <p>Uploaded on: {new Date(recording.uploadDate).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default App;