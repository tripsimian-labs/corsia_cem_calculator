# Introduction 

The following is a NodeJS implementation derived from ICAO CO2 Estimation Models (CEMs)
https://www.icao.int/environmental-protection/CORSIA/Pages/CEM2019.aspx  

The methodolgy used is the one referred to here: 
https://www.icao.int/environmental-protection/CarbonOffset/Documents/Methodology%20ICAO%20Carbon%20Calculator_v11-2018.pdf 

## What it does
The app is designed as a NodeJS JSON/REST API.  
The general flow is as follows: 
- Input: departure airport, arrival airport, and aircraft type
- lookup latitude & longitude for the respective airports
- calculate "great circle" distance between the two points
- lookup CEM values for the aircraft type
- calculate tons carbon dioxide emissions (tCO2) based on CEM algorithm

Results can be cross referenced with ICAOs online calculator: 
https://www.icao.int/environmental-protection/CarbonOffset/Pages/default.aspx

## Installation

	npm install express papaparse great-circle 
	node index.js

## Examples

	curl -X POST http://localhost:3000/ -H "content-type: application/json" -d "{\"departure_airport_iata_code\":\"SIN\",\"arrival_airport_iata_code\":\"LHR\",\"aircraft_type\":\"A388\"}"
	{"distance_km":10883.30457925924,"fuel":167773.3177739804,"tCO2":530163.6841657781}

	curl -X POST http://localhost:3000/ -H "content-type: application/json" -d "{\"departure_airport_iata_code\":\"SIN\",\"arrival_airport_iata_code\":\"CDG\",\"aircraft_type\":\"A388\"}"
	{"distance_km":10724.61401542344,"fuel":165185.55074951,"tCO2":521986.3403684516}

	curl -X POST http://localhost:3000/ -H "content-type: application/json" -d "{\"departure_airport_iata_code\":\"SIN\",\"arrival_airport_iata_code\":\"JFK\",\"aircraft_type\":\"A388\"}"
	{"distance_km":15340.580176631698,"fuel":240458.11094033308,"tCO2":759847.6305714526}

	curl -X POST http://localhost:3000/ -H "content-type: application/json" -d "{\"departure_airport_iata_code\":\"SIN\",\"arrival_airport_iata_code\":\"SFO\",\"aircraft_type\":\"A388\"}"
	{"distance_km":13581.551232190033,"fuel":211773.62594332284,"tCO2":669204.6579809003}

	curl -X POST http://localhost:3000/ -H "content-type: application/json" -d "{\"departure_airport_iata_code\":\"SIN\",\"arrival_airport_iata_code\":\"HKG\",\"aircraft_type\":\"A388\"}"
	{"distance_km":2565.579402753632,"fuel":40616.856681509824,"tCO2":128349.26711357106}


Copyright 2021 TripSimian Solutions Pte Ltd (Singapore)
