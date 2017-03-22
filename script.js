/**
 * Display forgeofempires JSON Copyright (C) 2017 modulo22
 * 
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 */


$(document)
    .ready(
        function() {

            var weekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'
                .split('_');
            var rdata = [];
            var friendList = [];
            var guildList = [];
            var neighborList = [];
            var playerMap = {};
            var since;
            var charts = {};

            $("#friend-status,#event-status,#neighbor-status,#guild-status")
                .attr("class", "glyphicon glyphicon-minus-sign");

            function extractData(data) {
                var stats = _.find(data, function(e) {
                    return e.requestClass === 'OtherPlayerService' &&
                        e.requestMethod === 'getEvents';
                });
                if (stats) {
                    rdata = stats.responseData[0];
                    _.each(rdata, function(e) {
                        e.parsedDate = parseDate(e.date)
                    });
                    since = rdata[rdata.length - 1].parsedDate;
                    $("#from-date").text(
                    		since.format("LLLL"));
                    $("#event-status").attr("class",
                        "glyphicon glyphicon-ok-sign");
                }
                var startup = _.find(data, function(e) {
                    return e.requestClass === 'StartupService' &&
                        e.requestMethod === 'getData';
                });
                if (startup) {
                    var list = startup.responseData.socialbar_list;
                    if (_.every(list, function(e) {return e.is_invited || e.is_friend || e.incoming})) {
                        setFriends(list)
                    } else if (_.every(list, ['is_guild_member', true])) {
                        setGuilds(list)
                    } else {
                        setNeighbors(list)
                    }
                }

                _.each([{
                    f: setFriends,
                    m: 'getFriendsList'
                }, {
                    f: setGuilds,
                    m: 'getClanMemberList'
                }, {
                    f: setNeighbors,
                    m: 'getNeighborList'
                }], function(el) {
                    var list = _.find(data, function(e) {
                        return e.requestClass === 'OtherPlayerService' &&
                            e.requestMethod === el.m;
                    });
                    if (list) {
                        el.f(list.responseData)
                    }
                });
                // console.log(_.uniq(_.map(rdata, "type")))
                displayTavern();
                displaySocial();
            }

            function setFriends(list) {
                friendList = list;
                $("#friend-status").attr("class",
                    "glyphicon glyphicon-ok-sign");
            }

            function setGuilds(list) {
                guildList = list;
                $("#guild-status").attr("class",
                    "glyphicon glyphicon-ok-sign");
            }

            function setNeighbors(list) {
                neighborList = list;
                $("#neighbor-status").attr("class",
                    "glyphicon glyphicon-ok-sign");
            }

            $("#input-button").click(function() {
                extractData(JSON.parse($("#input-text").val()));
                $("#input-text").val("")
            });

            $("#friend,#guild").click(function() {
                $(this).toggleClass("btn-default btn-info");
                displaySocial()
            });

            function parseDate(date) {
                if (date.indexOf("today at") == 0) {
                    return moment(date.substring(9), "HH:mm a");
                }
                if (date.indexOf("yesterday at") == 0) {
                    return moment(date.substring(13), "HH:mm a").add(-1, 'day');
                }
                for (var i = 0; i < weekdays.length; i++) {
                    if (date.indexOf(weekdays[i] + " at") == 0) {
                        var m = moment(date
                            .substring(weekdays[i].length + 4),
                            "HH:mm a");
                        var d = i -
                            _.indexOf(weekdays, moment().format(
                                'dddd'));
                        if (d > 0) {
                            d -= 7;
                        }
                        return m.add(d, "day");
                    }
                }
                return moment(date, "DD/MM [at] HH:mm a");
            }

            function displayTavern() {
                var tdata = _.filter(rdata, ['type',
                    'friend_tavern_sat_down'
                ]);
                
                $("#tavern").empty().append(displayTable(tdata, null, "tavernchart",'Tavern sit'));
            }

            function displaySocial() {
                var tdata = _.filter(rdata, ['type',
                    'social_interaction'
                ]);
                if ($("#friend").hasClass("btn-info")) {
                    tdata = _.filter(tdata, function(e) {
                        return e.other_player.is_friend
                    });
                }
                if ($("#guild").hasClass("btn-info")) {
                    tdata = _.filter(tdata, function(e) {
                        return e.other_player.is_guild_member
                    });
                }
                $("#help").empty().append(
                    displayTable(tdata, $("#guild").hasClass(
                        "btn-info"),"helpchart",'Polish/motivate'));
            }
            
            function displaygraph(name, displayname, rdata) {
            	if(since) {
                    var all = {};
                    var min = -1;
                    var max = -1;
                    var delta = 1000 * 60 * 60;
                    _.each(rdata, function(e) {
                    	var h = Math.round(e.parsedDate.toDate().getTime() / delta) * delta;
                    	min = min == -1 ? h : Math.min(h, min);
                    	max = max == -1 ? h : Math.max(h, max);
                    	all[h] = (all[h] || 0) + 1;
                    });
                    for(var i = min; i < max ; i += delta) {
                    	if(!all[i]) {
                    		all[i] = 0;
                    	}
                    }
                    var gdata = [];
                    _.each(all, function(val, key) {
                    	gdata.push({x:parseInt(key), y:val});
                    });
                    gdata = _.sortBy(gdata, ["x"]);
                    if(charts[name]) {
                    	charts[name].destroy();
                    }
                    charts[name] = new Chart($("#" + name), {
                        type: 'line',
                        data: {
                            datasets: [{
                                label: displayname,
                                data: gdata,
                                fill: false
                            }]
                        },
                        options: {
                            scales: {
                                xAxes: [{
                                	type: 'time',
                                    time: {
                                    	tooltipFormat: 'LLLL',
                                    	unit: 'day'
                                    }
                                }],
                                yAxes: [{
                                    ticks: {
                                        stepSize: 1
                                    }
                                }]
                            }
                        }
                    });
                }
            }

            function displayTable(data, guildonly, graphname, displayname) {            	
            	displaygraph(graphname,displayname, data);
                var count = _.reduce(data, function(all, e) {
                    if (!all[e.other_player.name]) {
                        all[e.other_player.name] = {
                            other_player: e.other_player,
                            nb: 0
                        };
                    }
                    all[e.other_player.name].nb++;
                    return all;
                }, {});
                _.each(guildonly ? guildList : friendList, function(e) {
                    if (!count[e.name]) {
                        count[e.name] = {
                            other_player: e,
                            nb: 0
                        };
                    } else {
                        count[e.name].other_player = e;
                    }
                });
                var users = [];
                _.each(count, function(val, name) {
                    if (!val.other_player.score) {
                        _.each([guildList, friendList, neighborList],
                            function(e) {
                                var player = _.find(e, ['name',
                                    name
                                ]);
                                if (player) {
                                    val.other_player = player;
                                    return false;
                                }
                            });
                    }
                    users.push({
                        nb: val.nb,
                        name: name,
                        score: val.other_player.score,
                        friend: val.other_player.is_friend,
                        guild: val.other_player.is_guild_member
                    });
                });
                var sorted = _.sortBy(users, [function(o) {
                    return -o.nb;
                }, 'name']);
                var table = $("<table class='table table-hover'>");
                $(
                        "<thead><tr><th>Rank</th><th>Name</th><th>Action count</th><th>Score</th></tr></thead>")
                    .appendTo(table);
                var tbody = $("<tbody>").appendTo(table);
                _.each(
                    sorted,
                    function(e, i) {
                        tbody
                            .append("<tr data-name='"+e.name+"'><td>" +
                                (i + 1) +
                                " " +
                                (e.friend ? "<span class='glyphicon glyphicon-user'></span>" :
                                    "") +
                                " " +
                                (e.guild ? "<span class='glyphicon glyphicon-tower'></span>" :
                                    "") +
                                "</td><td>" +
                                e.name +
                                "</td><td>" +
                                e.nb +
                                "</td><td>" +
                                e.score +
                                "</td></tr>");
                    });
                table.find("tr[data-name]").click(function() {
                	var el = $(this);
                	var name = el.attr("data-name");
                	var isActive = el.hasClass("info");
                	
                	el.closest("table").find("tr").removeAttr("class");
                	if(isActive) {
                		displaygraph(graphname,displayname, data);
                	} else {
                		el.addClass("info")
                		el.addClass("activate")
                		displaygraph(graphname,displayname, _.filter(data, function(e) {return e.other_player.name === name}));
                	}
                })
                return table;
            }
// for debugging create files with the content of the JSON. For example, "window.data1=[JSON here]"
//            extractData(data1)
//            extractData(data2)
        });