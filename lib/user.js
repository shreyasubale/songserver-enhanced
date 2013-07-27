var utils = require('util');

function User(ip, name, adminList) {
    this.name = name || utils.format('Anonymous (%s)', ip);
    this.ip = ip;
    this.isActive = true;
    this.queuedSongsCount = 0;
    this.isAdmin = adminList.indexOf(this.ip)>-1?true:false;
}

User.prototype = {
    setName: function (name) {
        this.name = name;
    },
    
    disConnect: function () {
        this.isActive = false;
    },
    
    connect: function () {
        this.isActive = true;
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
            isAdmin : this.isAdmin
        };
    }
}

function Users(adminList) {
    this._users = {};
    this.count = 0;
    this.adminList = adminList || [];
}

Users.prototype = {
    add: function (ip, name) {
        return this._users[ip instanceof User ? ip.ip : ip] || this._createUser(ip, name);
    },
    
    _createUser: function (ip, name) {
        this.count++;
        if (ip instanceof User) {
            return this._users[ip.ip] = ip;
        } 
        return this._users[ip] = new User(ip, name, this.adminList);
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


