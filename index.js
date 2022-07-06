const fs = require("fs");
const http = require("http");
const https = require("https");

const credentials = require("./auth/credentials.json");

const port = 3000;
const server = http.createServer();

server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
    console.log(`Now listening on port ${port}`);
}

server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New request from ${req.socket.remoteAddress} for ${req.url}`);
    /*
        User gets the landing page form if the url is the root.
        
    */
    if(req.url === "/") {
        const form = fs.createReadStream("html/index.html");
        res.writeHead(200, {"Content-Type": "text/html"}); // means - content type received by browser should be interpreted as plaintext
        form.pipe(res); //pipe (forward) the readable stream (form) to res (client)
    }
    /*
        User fills out the form and clicks search.
        The user's input goes into the URL: /search?Season=<user input>

        user_input is a url object that gets assigned the requested url (req.url) and the host name (server)
        I extract the user input into the season variable using the .get function. Since the .searchparams makes the url a hashmap, the key
        of the season is the "Season" field in the html doc.
    */
    else if(req.url.startsWith("/search")){
        const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
        let season = user_input.get('Season');
        if(season == null || season == ""){
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end("<h1>Missing Input</h1>");
        }
        else{
            res.writeHead(200, {"Content-Type": "text/html"});
            /*
            for(i=0; i < responseCache.length; i++){
                if(responseCache[i].season === season){
                    handleCached(responseCache[i], res);
                }
            }
            */
           
            // Assuming the season variable is fine, we pass it through the make_request function to start the first API call
            make_request(season, res);
        }

    }
    else {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end(`<h1>404 Not Found</h1>`);
    }

}

/*
    Here I declare the endpoint for the football API. I appended the season value to the proper location on there.
    Then, I used an https.get request on that endpoint, and provided my API key along with it.

    footballAPI_request.once is a one timie listener for the response event and its callback is the process_stream function you provided in an earlier demo.

*/

function make_request(season, res) {
    const footballAPI_endpoint = `https://v3.football.api-sports.io/players/topscorers?league=78&season=${season}`;
    const footballAPI_request = https.get(footballAPI_endpoint, {headers:credentials});

    footballAPI_request.once("response", stream => process_stream(stream, parse_footballAPI, season, res));
}
/*
    take stream of data (the data from the football API) and convert it to a string one chunk at a time.
    parse it one chunk at a time and add it to 'body'./
    When theres no more data, you get an end event which calls the callback
*/
function process_stream(stream, callback, ...args){
    let body = "";
    stream.on("data", chunk => body += chunk);
    stream.on("end", () => callback(body, ...args));
}

/*
    The callback for the first call to process_stream is parse_footballAPI.
    JSON.parse() is used on the body from process_stream and it's assigned to the "responseObject"
    Here i get the player's name and important details from that season.

    The if statement checks for a proper season input.

    In the else statement, I make the call to the imsea API. I added the playername to the endpoint and made another
    https.get request, this time on this endpoint.
    Just like for footballAPI, there's an event listener for "response" and its callback is process_stream.
*/

function parse_footballAPI(body, season, res){
    let responseObject = JSON.parse(body);
    let playerName = responseObject?.response[0]?.player?.firstname + ' ' + responseObject?.response[0]?.player?.lastname;
    let playerAge = responseObject?.response[0]?.player?.age;
    let playerNat = responseObject?.response[0]?.player?.nationality;
    let playerTeam = responseObject?.response[0]?.statistics[0]?.team?.name;
    let playerLeague = responseObject?.response[0]?.statistics[0]?.league?.name;
    let gamesPlayed = responseObject?.response[0]?.statistics[0]?.games?.appearences;
    let goals = responseObject?.response[0]?.statistics[0]?.goals?.total;
    let assists = responseObject?.response[0]?.statistics[0]?.goals?.assists;

    let stats =`<p>Age: ${playerAge}<br>Nationality: ${playerNat}<br>Team: ${playerTeam}<br>League: ${playerLeague}<br>Games Played: ${gamesPlayed}<br>
    Goals Scored: ${goals}<br>Assists: ${assists}</p>`;

    if (responseObject?.response.length === 0) {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end(`<h1>404 Not Found</h1>`);
    }
    else{

        const imsea_endpoint = `https://imsea.herokuapp.com/api/1?q=${playerName}`;
        const imsea_request = https.get(imsea_endpoint);
    
        imsea_request.once("response", stream => process_stream(stream, parse_imseaAPI, playerName, stats, res));

       // cacheData(responseObject, season);
    }

}

/*
    The second call to process_stream worked the same as before, but its callback is the parse_imseaAPI function this time.
    imsea provides links to images stored in an array of a json object, so i just stored the first link that comes up in the imsea_object field

    finally now that i have the image I send it back to the client with res.end().
    Also, I passed along some fields from the first API request. I stored the playername and stats so I can use them here when its time to invoke res.end.
    It's just to provide a few more details along with the picture.

    Regarding input resiliancy: (professors if statement from an earlier demo) & my if statement in parse_footballAPI
*/

function parse_imseaAPI(body, playerName, stats, res){
    let imsea_object = JSON.parse(body);
    let playerImage = imsea_object?.results[0];
    let showImage = `<u1><img src = ${playerImage}</u1>`;

    res.writeHead(200, {"Content-Type": "text/html"});
    res.write(`<h1>${playerName}:</h1><u1>Season Stats: ${stats}</u1>`);      
    
    res.end(showImage);
}

/*

    Failed attempt at caching. Leaving it here for a future struggle.

let responseCache = [];

function cacheData(responseObject, season){
    responseCache.push({season, responseObject});
}

function handleCached(indexedObject, res){
    let responseObject = indexedObject.responseObject
    let playerName = responseObject?.response[0]?.player?.firstname + ' ' + responseObject?.response[0]?.player?.lastname;
    let playerAge = responseObject?.response[0]?.player?.age;
    let playerNat = responseObject?.response[0]?.player?.nationality;
    let playerTeam = responseObject?.response[0]?.statistics[0]?.team?.name;
    let playerLeague = responseObject?.response[0]?.statistics[0]?.league?.name;
    let gamesPlayed = responseObject?.response[0]?.statistics[0]?.games?.appearences;
    let goals = responseObject?.response[0]?.statistics[0]?.goals?.total;
    let assists = responseObject?.response[0]?.statistics[0]?.goals?.assists;
    res.writeHead(200, {"Content-Type": "text/html"});
    let stats =`<p>Age: ${playerAge}<br>Nationality: ${playerNat}<br>Team: ${playerTeam}<br>League: ${playerLeague}<br>Games Played: ${gamesPlayed}<br>
    Goals Scored: ${goals}<br>Assists: ${assists}</p>`;
    res.write(`<h1>${playerName}:</h1><u1>Season Stats: ${stats}</u1>`);    

    const imsea_endpoint = `https://imsea.herokuapp.com/api/1?q=${playerName}`;
    const imsea_request = https.get(imsea_endpoint);

    imsea_request.once("response", stream => process_stream(stream, parse_imseaAPI, res));
}
*/