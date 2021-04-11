import React from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import {AmbientLight, PointLight, LightingEffect} from '@deck.gl/core';
import {HexagonLayer} from '@deck.gl/aggregation-layers';
import {IconLayer} from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import {readString} from "react-papaparse";
//import Supercluster from 'supercluster';

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000]
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000]
});

const lightingEffect = new LightingEffect({ambientLight, pointLight1, pointLight2});

const material = {
  ambient: 0.64,
  diffuse: 0.6,
  shininess: 32,
  specularColor: [51, 51, 51]
};

const INITIAL_VIEW_STATE = {
  longitude: 126.9779,
  latitude: 37.5663,
  zoom: 10,
  minZoom: 1,
  maxZoom: 15,
  pitch: 40.5,
  bearing: -27
};

// 더 많은 세팅: https://colorbrewer2.org
// set "Number of data classes" to 6
export const colorRange1 = [
  [255,255,212],
  [254,227,145],
  [254,196,79],
  [254,153,41],
  [217,95,14],
  [153,52,4]
];

export const colorRange2 = [
  [239,243,255],
  [198,219,239],
  [158,202,225],
  [107,174,214],
  [49,130,189],
  [8,81,156]
];

function getTooltip({object}) {
  if (!object) {
    return null;
  }
  const lat = object.position[1];
  const lng = object.position[0];
  const count = object.points.length;

  //var obj = document.getElementById(that.getAttribute('id')).getAttribute('id');	
  //console.log(JSON.stringify(object, null, 5)); object의 구조를 확인

  if(object['points'][0]['2'] == 'firefightingobject'){
    return `\
    latitude: ${Number.isFinite(lat) ? lat.toFixed(6) : ''}
    longitude: ${Number.isFinite(lng) ? lng.toFixed(6) : ''}
    ${count} firefighting-object`;
  }
  else if(object['points'][0]['2'] == 'water'){
    return `\
    latitude: ${Number.isFinite(lat) ? lat.toFixed(6) : ''}
    longitude: ${Number.isFinite(lng) ? lng.toFixed(6) : ''}
    ${count} water`;
  }
  else
    return null;
 
}

const ICON_MAPPING = {
  marker: {x: 0, y: 0, width: 128, height: 128, mask: true, anchorY: 150}
}

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = 'mapbox://styles/mapbox/dark-v9',
  radius = 600,  
  lowerPercentile = 0,
  upperPercentile = 100,
}) {
  const layers = [
    // reference: https://deck.gl/docs/api-reference/aggregation-layers/hexagon-layer
    
    new IconLayer({
      id: 'emergency',
      data: data[0],
      billboard: true,
      getAngle: 0,
      getColor: [255, 0, 0],
      getPosition: d => d,
      getIcon: d => 'marker',
      iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
      iconMapping: ICON_MAPPING,
      opacity: 1,
      pickable: false,
      sizeScale: 30,
    }),
    
    new IconLayer({
      id: 'position',
      data: data[1],
      billboard: true,
      getAngle: 0,
      getColor: [0, 255, 0],
      getPosition: d => d,
      getIcon: d => 'marker',
      iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
      iconMapping: ICON_MAPPING,
      opacity: 1,
      pickable: false,
      sizeScale: 10,
    }),
    

    new HexagonLayer({
      id: 'firefightingobject',
      colorRange: colorRange1,
      coverage: 1,
      data: data[2],
      extruded: false,
      getPosition: d => d,
      pickable: true,
      radius,
      upperPercentile,
      material,

      transitions: {
        elevationScale: 50
      }
    }),

    new HexagonLayer({
      id: 'water',
      colorRange: colorRange2,
      coverage: 0.3,
      data: data[3],
      elevationRange: [0, 100],
      opacity: 0.2,
      elevationScale: data[3] && data[3].length ? 50 : 0,
      extruded: true,
      getPosition: d => d,
      pickable: true,
      radius,
      upperPercentile,
      material,

      transitions: {
        elevationScale: 50
      }
    })
  ];

  return (
    <DeckGL
      layers={layers}
      effects={[lightingEffect]}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
    >
      <StaticMap
        reuseMaps
        mapStyle={mapStyle}
        preventStyleDiffing={true}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />
    </DeckGL>
  );
}

function is_coordinates_valid(lng,lat) {
  return (Number.isFinite(lng) 
    && Number.isFinite(lat) 
    && lat >= -90 
    && lat <= 90);
}

export function renderToDOM(container) {

    // CSV version
    const DATA_CSV1 = "서울시 서소위치 위치정보 (좌표계_ WGS1984).csv";
    const DATA_CSV2 = "서울시 비상소화장치 위치정보 (좌표계_ WGS1984).csv";
    const DATA_CSV3 = "서울시 소방대상물 위치정보 (좌표계 _ WGS1984).csv";
    const DATA_CSV4 = "서울시 소화용수 위치정보 (좌표계_ WGS1984).csv";

    Promise.all([
      fetch(DATA_CSV1).then(response => response.text()),
      fetch(DATA_CSV2).then(response => response.text()),
      fetch(DATA_CSV3).then(response => response.text()),
      fetch(DATA_CSV4).then(response => response.text()),
    ])
    .then(function(values) {

      const result1 = readString(values[0]);
      const result2 = readString(values[1]);
      const result3 = readString(values[2]);
      const result4 = readString(values[3]);
      
      const data1 = result1.data
          // d[4] = longitude(경도), d[3] = latitude(위도)
        .map(d => [Number(d[4]), Number(d[3])])
        // 위도&경도 유효성 검사
        .filter(d =>  
          Number.isFinite(d[0]) 
          && Number.isFinite(d[1]) 
          && d[1] >= -90 
          && d[1] <= 90);

      const data2 = result2.data
          // d[7] = longitude(경도), d[6] = latitude(위도)
        .map(d => [Number(d[7]), Number(d[6])])
        // 위도&경도 유효성 검사
        .filter(d =>  
          Number.isFinite(d[0]) 
          && Number.isFinite(d[1]) 
          && d[1] >= -90 
          && d[1] <= 90);
      
      const data3 = result3.data
          // d[14] = longitude(경도), d[13] = latitude(위도)
        .map(d => [Number(d[14]), Number(d[13]), 'firefightingobject'])
        // 위도&경도 유효성 검사
        .filter(d =>  
          Number.isFinite(d[0]) 
          && Number.isFinite(d[1]) 
          && d[1] >= -90 
          && d[1] <= 90);
        
      const data4 = result4.data
          // d[10] = longitude(경도), d[9] = latitude(위도)
        .map(d => [Number(d[10]), Number(d[9]), 'water'])
        // 위도&경도 유효성 검사
        .filter(d =>  
          Number.isFinite(d[0]) 
          && Number.isFinite(d[1]) 
          && d[1] >= -90 
          && d[1] <= 90);
          

      render(<App data={[data1, data2, data3, data4]} />, container);
    });
}
