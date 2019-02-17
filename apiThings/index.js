var request = require('request');
var url = 'https://api.turkishairlines.com/test/getPortList';
var queryParams = '?' +  encodeURIComponent('airlineCode') + '=' + encodeURIComponent('AJ')+ '&' +  encodeURIComponent('languageCode') + '=' + encodeURIComponent('TR')+ '&' +  encodeURIComponent('apikey') + '=' + encodeURIComponent('l7xxcf1ef0caa70b47fdab1ef11f35e1463e');
request({
    url: url + queryParams,
    headers: { 'apisecret':'d13b88a41f164f619692579052c65c5a', 'apikey':'l7xxcf1ef0caa70b47fdab1ef11f35e1463e'  },
    method: 'GET'
}, function (error, response, body) {
    var data = JSON.parse(body).data;
    console.log(data);
});