var http = require('http'),
    pg = require('pg'),
    fetch = require('node-fetch');

require('dotenv').config();

let db_config = {
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST
}
var pgpool = new pg.Pool(db_config),
    cq = function (s, p, f) {
      console.log("userName: ", db_config.user);
      console.log("dataBase: ", db_config.database);
      console.log("host: ", db_config.host);
      pgpool.query(s, p, (e, rs) => { f(e, rs); });
    };

pgpool.on('error', (e, c) => {
    console.log('pgpool error: ' + e);
    pgpool.end();
    setTimeout(function () {
        pgpool = new pg.Pool(db_config);
    }, 100);
})

var js = function (d) { if (!d || d.isString) return d; try { return JSON.stringify(d); } catch (err) { return null; } };

const PORT = process.env.PORT || 5000;

const server = http.createServer(function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress; ip = ip.split(',')[0];
    var token = (req.headers['cookie'] || '').split(';'); for (var i = 0; i < token.length; i++)if (token[i].trim().search('x-access-token') == 0) { token = token[i].replace('x-access-token=', '').trim(); } if (token.isArray) token = 0;
    var deviceId;
    res.setHeader("Access-Control-Allow-Origin", '*');
    var sendResp = function (response) { res.end(js(response ? response : 'fail')); return; }
    try {
        var d = ''; res.setHeader("Access-Control-Allow-Origin", '*');
        if (req.method == "GET") { console.log('Get method called'); res.end('User Service is UP!'); return; }
        if (req.method != "POST" && req.method != "GET") { sendResp('Only POST requests allowed!'); return; }
        res.setHeader('Content-Type', 'application/json');
        req.on('data', function (xdata) { d += xdata; });
        req.on('end', function () {
            try {
                d = JSON.parse(d);
                fun = d.f || d.fun || d.func;
                data = d.data;
                console.log('req url: ', fun);
                switch (fun) {
                    case 'ping':
                        sendResp({ status: 'success', data: {}, msg: 'pong' });
                        break;
                    case 'getUsers':
                        cq("SELECT * FROM g.users", [], function (error, result) {
                            if (error) { sendResp({ status: 'fail', statusCode: 500, msg: error }); return; }
                            if (result.rows) {
                                sendResp({ status: 'success', statusCode: 200, msg: 'All user', data: result.rows });
                                return;
                            }
                        });
                        break;
                    case 'addUser':
                        cq("INSERT INTO g.users(info) VALUES($1) RETURNING id", [data], function (error, result) {
                            if (error) { sendResp({ status: 'fail', statusCode: 500, msg: error }); return; }
                            if (result.rows) {
                                sendResp({ status: 'success', statusCode: 200, msg: 'user added', data: result.rows[0] });
                                return;
                            }
                        });
                        break;
                    case 'getUser':
                        cq("SELECT * FROM g.users WHERE id=$1", [data.id], function (error, result) {
                            if (error) { sendResp({ status: 'fail', statusCode: 500, msg: error }); return; }
                            if (result.rows) {
                                let u = result.rows[0];
                                if (u) sendResp({ status: 'success', statusCode: 200, msg: 'user found', data: u });
                                else sendResp({ status: 'fail', statusCode: 200, msg: 'No user found', data: [] });
                                return;
                            }
                        });
                        break;
                    case 'updateUser':
                        cq("UPDATE g.users SET info=$2 WHERE id=$1 RETURNING id", [data.id, data], function (error, result) {
                            if (error) { sendResp({ status: 'fail', statusCode: 500, msg: error }); return; }
                            if (result.rows) {
                                sendResp({ status: 'fail', statusCode: 200, msg: 'user updated', data: result.rows });
                                return;
                            }
                        });
                        break;
                    case 'deleteUser':
                        cq("DELETE FROM g.users WHERE id=$1", [data.id], function (error, result) {
                            if (error) { sendResp({ status: 'fail', statusCode: 500, msg: error }); return; }
                            sendResp({ status: 'success', statusCode: 200, msg: 'user deleted', data: {} });
                            return;
                        });
                        break;
                    case 'getWeatherByCity':
                        let city = data.city;
                        let apiKey = process.env.WEATHER_API_KEY;
                        let weather_api_url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
                        fetch(weather_api_url)
                            .then(res => res.json())
                            .then(
                                weather => {
                                    if (weather.main) {
                                        let message = `It's ${weather.main.temp} degrees in ${weather.name}!`;
                                        sendResp({ status: 'success', statusCode: 200, msg: message, data: weather });
                                    } else {
                                        sendResp({ status: 'fail', statusCode: 500, msg: weather.message }); return;
                                    }
                                },
                                err => {
                                    sendResp({ status: 'fail', statusCode: 500, msg: err }); return;
                                },
                            );
                        break;
                    default:
                        sendResp({ status: 'fail', statusCode: 404, msg: 'Page not found' }); return;
                }
            } catch (e) {
                sendResp({ status: 'fail', statusCode: 500, msg: e });
            }
        });
    } catch (e) { if (e) { console.log('outex', e); sendResp('fail'); return; } }

}).listen(PORT)
server.on('error', () => { console.log('error'); });
server.on('listening', () => { console.log(`Server started on port: ${PORT}`) });
