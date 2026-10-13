import MapView from '../components/MapView';
import { useApp } from '../context/AppContext';

export default function MapScreen() {
  const { state } = useApp();
  const { navigation } = state;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <MapView
        height="100%"
        showControls
        isFullScreen
        destination={
          navigation.destination
            ? {
                lat: navigation.destination.lat,
                lng: navigation.destination.lng,
                name: navigation.destination.name,
              }
            : undefined
        }
      />
    </div>
  );
}
