'use strict'

var Alexa = require('alexa-sdk');
var config = require('dotenv').config();
var helpers = require('./src/lib/helpers.js');
var SonarrAPI = require('sonarr-api');
var tvdbAPI = require("node-tvdb");

var sn = new SonarrAPI({
    hostname: config.SONARR_URL,
    apiKey: config.SONARR_API_KEY,
    port: 8989,
    urlBase: ''
});

var tvdb = new tvdbAPI(config.TVDB_API_KEY);

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    // Need to handle errors below!!
    'LaunchRequest': function () {
        this.emit(':tell', helpers.LAUNCH_DESCRIPTION);
    },
    'HelpIntent': function () {
        this.emit(':ask', helpers.HELP_RESPONSE);
    },
    'SeriesAirIntent': function () {
        var that = this;
        var seriesName = this.event.request.intent.slots.seriesName.value;
        // console.log(seriesName);
        tvdb.getSeriesByName(seriesName,
            function (err, results) {

                // If no results need to strip any spaces from series name string because this is not a wildcard search
                var airDate = new Date(results[0].FirstAired).toISOString().substring(0, 10);

                tvdb.getEpisodesById(results[0].id, function (err, results) {

                    // Use moment to format the date and sort out the time - perhaps add the network/provider the episode airs on

                    var airDate = getNextAirDate(results);

                    that.emit(':tell', seriesName + ' next airs on ' + airDate);

                });


            });
    },
    'AddSeriesIntent': function () {
        var that = this;
        var seriesName = this.event.request.intent.slots.seriesName.value;
        tvdb.getSeriesByName(seriesName,
            function (err, results) {
                var airDate = new Date(results[0].FirstAired).toISOString().substring(0, 10);

                this.emit(':ask', 'Add ' + results[0].SeriesName + ' that first aired on ' + airDate + ' to your list?');
            });

    }

}

// Move to helpers
function getNextAirDate(episodes) {
    var airDates = [];
    for (var episode in episodes) {
        if (new Date(episodes[episode].FirstAired) >= new Date())
            airDates.push(new Date(episodes[episode].FirstAired))
    }
    airDates.sort(function (a, b) {
        return Math.abs(1 - a / new Date()) - Math.abs(1 - b / new Date())
    });
    return airDates[0];
}