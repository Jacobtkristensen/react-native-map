import { addDoc, collection, doc } from "firebase/firestore";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useEffect, useState, useRef } from "react";
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes } from 'firebase/storage';
import { database, storage } from './firebase.js';

export default function App() {

  const [markers, setMarkers] = useState([]);
  const [region, setRegion] = useState({
    latitude: 55,
    longitude: 12,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  const mapView = useRef(null);
  const locationSubscription = useRef(null);

  useEffect(() => {
    // starte en listener
    async function startListening(){
      let {status} = await Location.requestForegroundPermissionsAsync();
      if(status !== 'granted'){
        console.log('Permission denied');
        return;
      }
      locationSubscription.current = await Location.watchPositionAsync({
        distanceInterval: 100,
        accuracy: Location.Accuracy.High
      }, (location) => {
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }
        setRegion(newRegion);
        if(mapView.current){
          mapView.current.animateToRegion(newRegion,);
        }
      });
    }
    startListening()
    return () => {
      if(locationSubscription.current){
        locationSubscription.current.remove();
      }
    }
  }, []); // tom array betyder: kører kun en gang

  async function addMarker(data) {
    const {latitude, longitude} = data.nativeEvent.coordinate;
    const newMarker = {
      coordinate: { latitude, longitude },
      key: data.timeStamp,
      title: "Good place",
    };
    setMarkers([...markers, newMarker]);


    // open camera roll
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });


    // upload to firebase storage
    const res = await fetch(result.assets ? result.assets[0].uri : result.uri);
    const blob = await res.blob();

    const uniqueFileName = `image_${new Date().getTime()}.jpg`

    const storageRef = ref(storage, uniqueFileName);
    await uploadBytes(storageRef, blob).then((snapshot) => {
      console.log('Uploaded a blob!');
    });
    
    const markerDocument = {
      title: newMarker.title,
      latitude: newMarker.coordinate.latitude,
      longitude: newMarker.coordinate.longitude,
      imageId: uniqueFileName,
    };

    try {
      await addDoc(collection(database, "Map_Location"), {content: markerDocument});
    } catch(error) {
      console.error("Error adding marker document: ", error);
    }


  }


  function onMarkerPressed(text) {
    alert("You pressed " + text);
  }
  return (
    <View style={styles.container}>
      <MapView 
      style={styles.map} 
      region={region} 
      onLongPress={addMarker}
      ref={mapView}
      >
        {markers.map((marker) => (
          <Marker 
          coordinate={marker.coordinate}
          key={marker.key}
          title={marker.title}
          onPress={() => onMarkerPressed(marker.title)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },
});
