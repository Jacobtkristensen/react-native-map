import { addDoc, collection, getDocs  } from "firebase/firestore";
import { StyleSheet, View, Modal, Image, TouchableOpacity, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useEffect, useState, useRef } from "react";
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from './firebase.js';

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
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
    async function fetchMarkers() {
      const querySnapshot = await getDocs(collection(database, "Map_Location"));
      const fetchedMarkers = querySnapshot.docs.map(doc => {
        let data = doc.data().content; 
        return {
          coordinate: { latitude: data.latitude, longitude: data.longitude },
          title: data.title || "Untitled",
          key: doc.id,// Firestore Id som unik identifier
          imageId : data.imageId ||  "defaultId", // Hvis der ikke er noget billede, så brug defaultId
        };
      });
      setMarkers(currentMarkers => [...currentMarkers, ...fetchedMarkers]);
    }

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
    fetchMarkers();
    startListening();
    return () => {
      if(locationSubscription.current){
        locationSubscription.current.remove();
      }
    }
  }, []); // tom array betyder: kører kun en gang

  async function addMarker(data) {
    const {latitude, longitude} = data.nativeEvent.coordinate;
    
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
      title: "Good place",
      latitude,
      longitude,
      imageId: uniqueFileName,
    };

    try {
      docRef = await addDoc(collection(database, "Map_Location"),
       {content: markerDocument});
    } catch(error) {
      console.error("Error adding marker document: ", error);
    }

    const newMarker = {
      coordinate: { latitude, longitude },
      key: docRef.id,
      title: "Good place",
      imageId: uniqueFileName,
    };
    setMarkers(currentMarkers => [...currentMarkers, newMarker]);
    console.log("newMarker: ", newMarker);
  }

  async function onMarkerPress(imageId) {
    console.log("imageID :", imageId)
    const imageRef = ref(storage, imageId);
    const imageUrl = await getDownloadURL(imageRef);
    setSelectedImage(imageUrl);
    setModalVisible(true);
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
          imageId={marker.imageId}
          onPress={() => onMarkerPress(marker.imageId)}
          />
        ))}
      </MapView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.imageStyle} /> 
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={() => setModalVisible(!modalVisible)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  imageStyle: {
    width: 300, 
    height: 300, 
  },
  button: {
    marginTop: 15,
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 20,
  },
});
