import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

export default function WorldMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    new window.google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      disableDefaultUI: true,
    });
  }, []);

  return (
    <div 
      ref={mapRef} 
      className="flex-1 rounded-2xl overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
}