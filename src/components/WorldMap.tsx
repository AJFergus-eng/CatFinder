import { useEffect, useRef } from 'react';

declare global {
  interface Window { google: any; }
}

interface CatMarker {
  lat: number;
  lng: number;
  catName: string;
  species: string;
}

interface WorldMapProps {
  markers?: CatMarker[];
}

export default function WorldMap({ markers = [] }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      disableDefaultUI: true,
    });

    markers.forEach(({ lat, lng, catName, species }) => {
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        title: catName,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family:serif"><strong>${catName}</strong><br/><span style="font-size:12px">${species}</span></div>`
      });

      marker.addListener('click', () => infoWindow.open(map, marker));
    });
  }, [markers]);

  return (
    <div
      ref={mapRef}
      className="flex-1 rounded-2xl overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
}