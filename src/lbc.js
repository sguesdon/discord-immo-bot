const
    db = require('node-localdb'),
    ciAds = db('resource/db/lbc.json'),
    EventEmitter = require('events').EventEmitter,
    schedule = require('node-schedule'),
    parser = require('node-html-parser').parse,
    request = require('request-promise-native');


module.exports = class CentreImmo extends EventEmitter {

    constructor(cronPattern = '0 */1 * * *') {
        super();
        this.host = 'https://www.leboncoin.fr';
        this.job = schedule.scheduleJob(cronPattern, this.checkNewAds.bind(this));
    }

    search(pageNumber = 1, ads = []) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                uri: `${this.host}/recherche/?text=tours%20centre&category=9&region=7&cities=Tours_37000&real_estate_type=2&price=min-175000&rooms=3-max&square=60-max&page=${pageNumber}`
            })
            .then((content) => {
                let currentAds = [];
                const body = parser(content);
                for(const ad of body.querySelectorAll('li')) {
                    if(ad.attributes && ad.attributes.itemtype === 'http://schema.org/Offer') {

                        let url = ad.querySelector('a').attributes.href,
                            id = parseInt(url.replace(/^.+?(\d+?)\.htm.+?$/, '$1'));

                        url = `${this.host}${url}`;
                        currentAds.push({id, url});
                    }
                }
                if(currentAds.length > 0) {
                    ads = ads.concat(currentAds);
                    this.search(pageNumber + 1, ads).then(resolve).catch(reject);
                } else {
                    resolve(ads);
                }
            })
            .catch(reject)
        });
    }

    checkNewAd(ad) {
        return new Promise((resolve, reject) => {
            ciAds.findOne({id: ad.id})
            .then((elt) => {
                if(!elt) {
                    this.emit('newAd', ad);
                    return ciAds.insert(ad);
                } else {
                    return Promise.resolve(false);
                }
            })
            .then(resolve)
            .catch(reject);
        });
    }

    checkNewAds() {
        console.info((new Date()).toString(), 'checking new lbc ads');
        this.search()
        .then((ads) => Promise.all(ads.map(this.checkNewAd.bind(this))))
        .then((ads) => ads.filter((ad) => ad))
        .catch((err) => console.error(err))
    }
}
