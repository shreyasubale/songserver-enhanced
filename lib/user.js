var utils = require('util');

function User(ip, name, isAdmin) {
    if (typeof name === "boolean") {
        name = null;
        isAdmin = name;
    }
    this.name = name || utils.format('Anonymous (%s)', ip);
    this.setIP(ip);
    this.isActive = true;
    this.queuedSongsCount = 0;
    this.isAdmin = !!isAdmin; //ensuring boolean
}

User.prototype = {
    setName: function (name) {
        this.name = name;
    },
    
    setIP: function (ip) {
        this.ip = ip;
    },
    
    setActive: function (val) {
        this.isActive = val;
        return this;
    },
    
    getName: function () {
        return this.name;
    },
    
    toJSON: function () {
        return {
            name: this.getName(),
            isActive: this.isActive,
            address: this.ip,
            isAdmin: this.isAdmin
        };
    }
}

function Users() {
    this._users = {};
    this.count = 0;
}

Users.prototype = {
    add: function (ip, name, isAdmin) {
        return this._users[ip instanceof User ? ip.ip : ip] || this._createUser(ip, name, isAdmin);
    },
    
    _createUser: function (ip, name, isAdmin) {
        this.count++;
        if (ip instanceof User) {
            return this._users[ip.ip] = ip;
        } 
        return this._users[ip] = new User(ip, name, isAdmin);
    },
    
    changeIP: function (user, newIP) {
        var oldIP;

        user = this.get(user);
        oldIP = user.ip;
        console.log("changing ip of user ", user, newIP);
        user.setIP(newIP);
        delete this._users[oldIP];
        return this._users[user.ip] = user;
    },
    
    getByIp: function (ip) {
        return this._users[ip];
    },
    
    get: function (obj) {
        return this.getByIp((obj instanceof User) ? obj.ip : obj); 
    },
    
    forEach: function (cb) {
        var users = this._users,
            ips = Object.keys(this._users);

        ips.forEach(function (ip, i) {
            cb.call(users[ip], users[ip], i, ip);
        });
    },
    
    remove: function (obj) {
        var user = this.get(obj);
        if (user) {
            delete this._users[user.ip];
            this.count--;
        }
    },
    
    size: function () {
        return this.count;
    },
    
    has: function (obj) {
        return !!this._users[(obj instanceof User) ? obj.ip : obj];
    },
    
    clear: function () {
        this._users = {};
        this.count = 0;
    },
    
    toJSON: function () {
        var users = this._users,
            ips = Object.keys(this._users);
            
        return ips.map(function (ip) {
            return this._users[ip].toJSON();
        }, this);
    }
};

exports.User = User;
exports.UserCollection = Users;


