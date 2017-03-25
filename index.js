'use strict';

// API key
require('dotenv').config();
if (typeof process.env.API_KEY === "undefined") {
	throw new Error("Missing API key!")
}

// Depedencies
var request = require('request');
var bigInt = require("big-integer");


//isPrime: checks if value is prime, return bool
function isPrime(value) {
  for (var i = 2; i < value; i++) {
    if(value % i === 0) {
      return false;
    }
  }
  return value > 1;
}

//define bit size of rsa key (max 32)
var size = 32;
console.log("key size:", size);

//store future prime numbers in array
var pq = [];

//get min and max of random primes from bit size
var min = bigInt(6074001000).shiftLeft(size/2 - 33);
var max = bigInt.one.shiftLeft(size/2).minus(1);

//specify parameters for request to random.org
var params = {
  "jsonrpc": "2.0",
  "method": "generateIntegers",
  "params": {
      "apiKey": process.env.API_KEY,
      "n": 1,
      "min": min.valueOf(),
      "max": max.valueOf(),
      "replacement": true,
      "base": 10
  },
  "id": 1
};

//request options
var options = {
	method: 'GET',
	uri: 'https://api.random.org/json-rpc/1/invoke',
	json: true,
	body: params
};


//getRandomPrimes: request random integers until we have two primes
function getRandomPrimes() {
	request(options, function (err, res, body) {
		//throw an error if request failed; abort
		if (err) {
			console.log(err);
			throw new Error("Error: Request failed");
		}

		//throw an error if the api returned one
		if (typeof body.result === 'undefined' && typeof body.error !== 'undefined') {
			console.log(body.error);
			throw new Error("Error: API returned error");
		}

		//got a random integer
		var rand_int = body.result.random.data[0];
		//console.log("got random int:", rand_int);

		//store number if prime, also check for stored duplicate
		if (isPrime(rand_int) && (!pq.length || rand_int !== pq[0])) {
			pq.push(rand_int);
			//console.log("stored prime:", rand_int);
		}

		//check if we have two primes
		if (pq.length < 2) {
			//if not, reroll after advised delay
			if (body.result.advisoryDelay > 0) {
				setTimeout(getRandomPrimes, body.result.advisoryDelay)
			} else {
				getRandomPrimes();
			}
		} else {
			//otherwise, continue
			console.log("got primes p and q:", pq);
			generateKeyPair(); //callback
		}
	});
}

//generate RSA key pair from primes stored in pq
function generateKeyPair() {
	console.log("\ngenerating key pair values...");
	var p = bigInt(pq[0]), q = bigInt(pq[1]), e = bigInt(65537), lambda;
	do {
		lambda = bigInt.lcm(p.minus(1), q.minus(1));
	} while (bigInt.gcd(e, lambda).notEquals(1) || p.minus(q).abs().shiftRight(size/2-100).isZero());

	var kpvals = {
		n: p.multiply(q),
		e: e,
		d: e.modInv(lambda)
	};

	console.log("n (public key I):", kpvals.n.toString());
	console.log("e (public key II):", kpvals.e.toString());
	console.log("d (private key):", kpvals.d.toString());
	console.log("\ndone.");
}

console.log("\ngetting random numbers...");
console.log("min:",min.toString());
console.log("max:",max.toString());
getRandomPrimes();
