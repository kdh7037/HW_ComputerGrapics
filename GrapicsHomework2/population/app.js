import React, { useState } from 'react';
import { render } from 'react-dom';
import { StaticMap } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, _SunLight as SunLight } from '@deck.gl/core';
import { scaleSequential } from 'd3-scale';
import { interpolateTurbo } from 'd3-scale-chromatic';
import { interpolateGreys } from 'd3-scale-chromatic';
import { readString } from "react-papaparse";

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

//https://github.com/d3/d3-scale-chromatic
export const COLOR_SCALE1 = x =>
  (
    scaleSequential()
      .domain([0, 4])
      .interpolator(interpolateTurbo)
  )(x)
    .slice(4, -1)
    .split(',')
    .map(x => parseInt(x, 10));

export const COLOR_SCALE2 = x =>
  (
    scaleSequential()
      .domain([0, 4])
      .interpolator(interpolateGreys)
  )(x)
    .slice(4, -1)
    .split(',')
    .map(x => parseInt(x, 10));

const INITIAL_VIEW_STATE = {
  // Seoul
  latitude: 37.5663,
  longitude: 126.9779,
  zoom: 11,
  maxZoom: 16,
  pitch: 45,
  bearing: 0
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 22),
  color: [255, 255, 255],
  intensity: 1.0,
  _shadow: false
});


function getTooltip({ object }) {
  return (
    object && {
      html: `\
  <div><b>${object.properties.adm_nm}</b></div>
  <br>
  <div>총인구수: ${object.properties.aging.total.toLocaleString()} 
      (남 ${object.properties.aging.total_m.toLocaleString()} / 
      여 ${object.properties.aging.total_f.toLocaleString()}) </div>
  <div>총고령자수(65세 이상): ${object.properties.aging.total_seniors.toLocaleString()} 
      (남 ${object.properties.aging.total_seniors_m.toLocaleString()} / 
      여 ${object.properties.aging.total_seniors_f.toLocaleString()}) </div>
  <div>내국인고령자수: ${object.properties.aging.domestic_seniors_total.toLocaleString()} 
      (남 ${object.properties.aging.domestic_seniors_m.toLocaleString()} / 
      여 ${object.properties.aging.domestic_seniors_f.toLocaleString()}) </div>
      <div>외국인고령자수: ${object.properties.aging.foreign_seniors_total.toLocaleString()} 
      (남 ${object.properties.aging.foreign_seniors_m.toLocaleString()} / 
      여 ${object.properties.aging.foreign_seniors_f.toLocaleString()}) </div>
  <br>
  <div>총독거노인수: ${object.properties.aging.solitude_total.toLocaleString()} 
      (남 ${object.properties.aging.solitude_m.toLocaleString()} / 
      여 ${object.properties.aging.solitude_f.toLocaleString()}) </div>
  `
    }
  );
}

export default function App({ data = DATA_URL, mapStyle = 'mapbox://styles/mapbox/light-v9' }) {

  const [effects] = useState(() => {
    const lightingEffect = new LightingEffect({ ambientLight, dirLight });
    lightingEffect.shadowColor = [0, 0, 0, 0.5];
    return [lightingEffect];
  });

  const layers = [
    new GeoJsonLayer({
      id: 'aging',
      data,
      opacity: 0.8,
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,
      getlineWidth: 1,
      getElevation: f => f.properties.aging.total * 0.05,
      getLineColor: f => COLOR_SCALE1(f.properties.aging.solitude_total / 200),
      getFillColor: f => COLOR_SCALE2(20 * f.properties.aging.total_seniors / f.properties.aging.total - 1),
      pickable: true
    })

  ];

  return (
    <DeckGL
      layers={layers}
      effects={effects}
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

export function renderToDOM(container) {
  //const DATA_CSV1 = "stat_population_Seoul.txt";
  const DATA_CSV1 = "독거노인(2019).txt";
  const DATA_CSV2 = "고령화.txt";
  const DATA_JSON = 'HangJeongDong_ver20200701.geojson';
  Promise.all([
    fetch(DATA_CSV1).then(response => response.text()),
    fetch(DATA_CSV2).then(response => response.text()),
    fetch(DATA_JSON).then(response => response.json())
  ])
    .then(function (values) {

      // parse the CVS file using papaparse library function
      const result1 = readString(values[0]);
      const result2 = readString(values[1]);
      // A helper function to parse numbers with thousand separator
      const parseIntComma = s => parseFloat(s.split(",").join(""));

      // Build population dictionary (동이름을 key로 사용)
      let dict_aging = {};

      for (const row of result1.data) {
        // 두 데이터의 동이름을 같게 하기 위해 인구데이터의 동이름에 포함된 "."를 모두 "·"로 치환
        //console.log(row[2]);
        let key = row[2].split(".").join("·"); //replaceAll 수정
        if (!isNaN(row[3])) {
          dict_aging[key] = {
            solitude_total: parseIntComma(row[3]),  // 총독거노인인구수
            solitude_m: parseIntComma(row[4]),  // 독거노인남성인구수
            solitude_f: parseIntComma(row[5]),  // 독거노인여성인구수
          };
        }
      }
      //고령화
      //result1key = Object.keys(dict_aging);

      for (const row of result2.data) {
        // 두 데이터의 동이름을 같게 하기 위해 인구데이터의 동이름에 포함된 "."를 모두 "·"로 치환
        //console.log(row[2]);
        let key = row[2].split(".").join("·"); //replaceAll 수정
        if (key in dict_aging) {
          dict_aging[key] = {
            ...dict_aging[key],
            ...{
              total: parseIntComma(row[3]),  // 총인구수
              total_m: parseIntComma(row[4]),  // 남성인구수
              total_f: parseIntComma(row[5]),  // 여성인구수
              total_seniors: parseIntComma(row[6]), // 총고령자수 (65세 이상)
              total_seniors_m: parseIntComma(row[7]), // 총남성고령자수
              total_seniors_f: parseIntComma(row[8]), // 총여성고령자수
              domestic_seniors_total: parseIntComma(row[9]), // 총내국인고령자수
              domestic_seniors_m: parseIntComma(row[10]), // 총남성내국인고령자수
              domestic_seniors_f: parseIntComma(row[11]), // 총여성내국인고령자수
              foreign_seniors_total: parseIntComma(row[12]), // 총외국인고령자수
              foreign_seniors_m: parseIntComma(row[13]), // 총남성외국인고령자수
              foreign_seniors_f: parseIntComma(row[14]),  // 총여성외국인고령자수
            }
          };
        }
      }
      console.log(dict_aging);

      // 서울특별시 데이터만 필터링
      let filtered_features = values[2].features.filter(f => f.properties.sidonm == "서울특별시");
      //console.log(dict_aging);

      // 각 동마다 인구정보를 추가
      filtered_features.forEach(function (f, idx) {
        // 각 동이름에는 "서울특별시"와 "구명"이 포함되어 있으므로 이를 제거
        this[idx].properties.aging =
          dict_aging[f.properties.adm_nm.split(" ")[2]];
      }, filtered_features);

      //정보가 맞지 않는 친구들은 랜더하지 않는다.
      filtered_features = filtered_features.filter(f => f.properties.aging != undefined);

      values[2].features = filtered_features;
      //console.log(values[3]);

      render(<App data={values[2]} />, container);
    });
}



