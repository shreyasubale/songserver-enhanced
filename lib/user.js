var utils = require('util');

function User(ip, name) {
    this.name = name || utils.format('Anonymous (%s)', ip);
    this.ip = ip;
    this.isActive = true; 
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
            address: this.ip
        };
    }
}

function Users() {
    this._users = {};
    this.count = 0;
}

Users.prototype = {
    add: function (ip, name) {
        return this._users[ip] || this._createUser(ip, name);
    },
    
    _createUser: function (ip, name) {
        this.count++;
        return this._users[ip] = new User(ip, name);
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
    }
};

exports.User = User;
exports.UserCollection = Users;


