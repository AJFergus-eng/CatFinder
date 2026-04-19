import { useEffect, useRef } from 'react';
import { getSpeciesColor } from '../utils/speciesColors';

declare global {
  interface Window { google: any; }
}

interface CatMarker {
  lat: number;
  lng: number;
  catName: string;
  species: string;
  isLost?: boolean;
}

export default function WorldMap({ markers = [] }: { markers?: CatMarker[] }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      disableDefaultUI: true,
    });

    markers.forEach(({ lat, lng, catName, species, isLost }) => {
      console.log(`🐱 ${catName} - isLost: ${isLost}`);
      const color = isLost ? '#EF4444' : getSpeciesColor(species);

      const circle = new window.google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: isLost ? 3 : 2,
        fillColor: color,
        fillOpacity: isLost ? 0.4 : 0.25,
        map,
        center: { lat, lng },
        radius: 400,
      });

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
    </svg>`;

  const marker = new window.google.maps.Marker({
    position: { lat, lng },
    map,
    title: catName,
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(32, 40),
      anchor: new window.google.maps.Point(16, 40),
    }
  });

  const infoWindow = new window.google.maps.InfoWindow({
    position: { lat, lng },
    content: `
      <div style="font-family:serif;padding:4px">
        ${isLost ? '<div style="color:#EF4444;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">⚠ Lost Cat</div>' : ''}
        <strong style="color:#3E3B39">${catName}</strong><br/>
        <span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">${species || 'Unknown'}</span>
      </div>`
  });

  marker.addListener('click', () => infoWindow.open(map));
  circle.addListener('click', () => infoWindow.open(map));
});
  }, [markers]);

  return (
    <div ref={mapRef} className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: '300px' }} />
  );
}