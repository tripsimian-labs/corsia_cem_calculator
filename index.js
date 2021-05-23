//Copyright 2021 TripSimian Solutions Pte Ltd (Singapore)

const fs = require('fs');
const GreatCircle = require('great-circle'); // great circle calculation 
const Papa = require('papaparse');//.csv file parser
//const cors = require('cors'); // To solve the cors issue

const express = require('express');
const port = 3000;

const DEBUG_RUN = true; 
const DEBUG_LOAD = false; 
const DEBUG_LOOKUP = true; 
const DEBUG_ERR = true; 

const main = async() => {
	
	/*
	Airport IATA code lookup to latitude/longitude mapping
	ourairports.com
		example: 
		26887,WSSS,large_airport,Singapore Changi Airport,1.35019,103.994003,22,AS,SG,SG-04,Singapore,yes,WSSS,SIN,,,,
		4185,LFPG,large_airport,Charles de Gaulle International Airport,49.012798,2.55,392,EU,FR,FR-IDF,Paris,yes,LFPG,CDG,,,,
	*/
	const airports_major_ww = await parseCSV('airports_major_ww.csv').then(result => {
			return result.data; 
		}).catch(error => {
			if (DEBUG_ERR) console.log(error); // Error: Oh dear! It's broken!
	});
	if (DEBUG_LOAD) console.log("airports_major_ww: ",  airports_major_ww);

	/*
	ICAO CORSIA CEM data based on aircraft type
	https://www.icao.int/environmental-protection/CORSIA/Pages/CEM2019.aspx
		example: 
		A320,777.554,3.950,500,1198.749,3.107,2500,608.492,3.343,3,CEM based on AO data (from COFdb),2018
	*/
	const icao_cemdata_2018 = await parseCSV('ICAO_CORSIA_CEMs_2018.csv').then(result => {
			return result.data; 
		}).catch(error => {
			if (DEBUG_ERR) console.log(error); // Error: Oh dear! It's broken!
	});
	if (DEBUG_LOAD) console.log("icao_cemdata_2018: ",  icao_cemdata_2018);

	const co2coefficient = 3.16;
	
	const getCO2 = async (flight_params) => {
		if (DEBUG_RUN) console.log("flight_params: ", flight_params);
		// Caluclate O/D airport distance / great circle with lat-long
		var departure_airport = await getCSVRowByKeyValue(airports_major_ww, 'iata_code', flight_params.departure_airport_iata_code);
		var arrival_airport = await getCSVRowByKeyValue(airports_major_ww, 'iata_code', flight_params.arrival_airport_iata_code);
		if (DEBUG_LOOKUP) console.log("departure_airport", departure_airport);
		if (DEBUG_LOOKUP) console.log("arrival_airport", arrival_airport);

		var distance = GreatCircle.distance(departure_airport.latitude_deg, departure_airport.longitude_deg, arrival_airport.latitude_deg, arrival_airport.longitude_deg);
		if (DEBUG_RUN) console.log("GreatCircle.distance: ", distance);


		/* Calculate tCO2 
		Please use the following formula: 
		Fuel (kg) = Intercept (kg) + Slope (kg/km) * Distance (km) between two breakpoints

		Notes: 
		• Last slope and intercept (e.g. Slope_3 and Intercept_3 for this example) remain valid beyond the last point (i.e. 1614 km for this example),,,,,,,,,
		• Results are Fuel in kg. CO2 emissions can be calculated using CO2 (in kg) = 3.16 * Fuel (in kg). ,,,,,,,,,
		• Rounding of results should occur at the aggregated level (i.e. after summing all CO2 emissions) and not at the individual flight level

		Examples:
		@ 150 km: Fuel (kg) = 5.057 (kg) + 52.593 (kg/km) * 150 (km) = 7894.007,,,,,,,,,
		@ 1000 km: Fuel (kg) = 10263.34 (kg) + 22.804 (kg/km) * 1000 (km) = 33067.340,,,,,,,,,
		@ 2500 km: Fuel (kg) = 18205.245 (kg) + 17.883 (kg/km) * 2500 (km) = 62912.745,,,,,,,,,

		*/
		
		var intercept, slope, fuel, tCO2;
		var acft_cem = await getCSVRowByKeyValue(icao_cemdata_2018, 'Type Designator', flight_params.aircraft_type);
		if (DEBUG_LOOKUP) console.log("acft_cem: ",  acft_cem);

		if ((acft_cem.Distance_First_Breakpoint == '')||(distance < +acft_cem.Distance_First_Breakpoint)){
		  fuel = +acft_cem.Intercept_1 + (+acft_cem.Slope_1 * distance);
		  if (DEBUG_LOOKUP) console.log("Intercept_1: ", +acft_cem.Intercept_1, " Slope_1: ", +acft_cem.Slope_1, )
		} else if ((acft_cem.Distance_Second_Breakpoint == '' )||(distance < +acft_cem.Distance_Second_Breakpoint)){
		  fuel = +acft_cem.Intercept_2 + (+acft_cem.Slope_2 * distance);
		  if (DEBUG_LOOKUP) console.log("Intercept_2: ", +acft_cem.Intercept_2, " Slope_2: ", +acft_cem.Slope_2, )
		} else {
		  fuel = +acft_cem.Intercept_3 + (+acft_cem.Slope_3 * distance);
		  if (DEBUG_LOOKUP) console.log("Intercept_3: ", +acft_cem.Intercept_3, "Slope_3: ", +acft_cem.Slope_3, )
		}
		tCO2 = fuel * co2coefficient;
		if (DEBUG_RUN) console.log('Fuel (kg): ' + fuel , ' - tCO2 (kg): ' + tCO2);
		return ({"distance_km":distance, "fuel":fuel, "tCO2":tCO2});
	}	
	
	const app = express();
	app.use(express.json());

	app.post('/', async (req, res) => {
	  var jsonResponse = await getCO2(req.body);
	  if (DEBUG_RUN) console.log("jsonResponse: ", jsonResponse);
	  res.json(jsonResponse);
	});

	app.listen(port, () => {
	  if (DEBUG_RUN) console.log(`Example app listening at http://localhost:${port}`);
	})
}

// load & parse CSV file to JSON
async function parseCSV(filename) {
  return new Promise(function(complete, error) {
        Papa.parse( fs.readFileSync(filename, "utf8"), {
		header: true, delimiter: ",", 
		complete, error
	});
  });
};
 
// iterate over each element in the array
async function getCSVRowByKeyValue(csv, key, value){
	for (var i = 0; i < csv.length; i++){
	  // look for the entry with a matching `code` value
	  row = csv[i]; 
	  if (row[key] == value){
		return row;
	  }
	}
}

main();

/*** 
Todo: adjust tCO2 for seat/cabin type
	from aircraft ACV (ex: J12Y156) derive proportional CO2 per seat/seat-type.
	Ex: 100 tCO2 = (12 *3.5 * tCO2coeff) + (156* 1 * tCO2coeff) =.5 tCO@/Y-seat or 1.7f tCO2/J-seat
	Return pax-level tCO2 for flight * seat-cabintype
*/
