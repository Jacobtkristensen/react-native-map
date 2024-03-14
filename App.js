import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import MapView, {Marker} from "react-native-maps";
import { useEffect, useState, useRef } from "react";
import * as Location from 'expo-location';
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

  function addMarker(data) {
    const {latitude, longitude} = data.nativeEvent.coordinate;
    const newMarker = {
      coordinate: { latitude, longitude },
      key: data.timeStamp,
      title: "Good place",
    };
    setMarkers([...markers, newMarker]);
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
