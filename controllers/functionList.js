/**
 * function to genrerate search query on based  url
 * @param  {[type]} url [description]
 * @return {[type]}     [description]
 */
exports.urlQuery = function(url) {
    var request = {};
    var pairs = url.substring(url.indexOf('?') + 1).split('&');
    for (var i = 0; i < pairs.length; i++) {
        if (!pairs[i])
            continue;
        var pair = pairs[i].split('=');
        if (pair.indexOf("page") != -1 || pair.indexOf("limit") != -1) {} else {
            if (pair.indexOf("client_id") != -1 || pair.indexOf("partner_id") != -1) {
                request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            } else {
                if (decodeURIComponent(pair[1]) !== "undefined") {
                    request[decodeURIComponent(pair[0])] = new RegExp(decodeURIComponent(pair[1]), "i");
                };

            }
        }
    }
    return request;
}
