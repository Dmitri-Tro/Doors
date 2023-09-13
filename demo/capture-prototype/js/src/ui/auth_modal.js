
'use strict';
const AuthModal = function(domain) {
    Modal.call(this);
    if (AuthModal.initialized) {
        return AuthModal.instance;
    } else {
        AuthModal.initialized = true;
        AuthModal.instance = this;
    }

    this.events = new EventsSystem();
    this.deniedMessage = 'Email/password incorrect.';
    this.template = '' +
        '<form action="" method="POST" class="auth">\n' +
        '    <header>\n' +
        '        <a href="<%=domain%>>" class="auth__logo">\n' +
        '          <img class="auth__logoimage" src="images/logos/<%=logo%>" alt="">\n' +
        '        </a>\n' +
        '    </header>\n' +
        '    <div class="form-group">\n' +
        '    <input type="email" class="form-control" placeholder="Email">\n' +
        '  </div>\n' +
        '  <div class="form-group">\n' +
        '    <input type="password" class="form-control" placeholder="Password">\n' +
        '  </div>\n' +
        '  <div class="row">' +
        '    <div class="col-xs-6"><span class="auth__message"></span></div>' +
        '    <div class="col-xs-6"><button type="submit" class="btn btn-primary pull-right">Sign in</button></div>' +
        '  </div>' +
        '</form>';
    this.domain = domain;
    this.domainShort = domain.replace(/http(s)*:\/\/(sandbox|sandy|app)?\./g, "");
    this.text = _.template(this.template)({domain: domain, logo: this.domainShort.slice(0, 4) + ".png"});
    this.tokenObtained = false;
    this.lastFailedQuery = null;

    this.handleClose();
    this.handleSubmit();
};

AuthModal.prototype = Object.create(Modal.prototype);
AuthModal.prototype.constructor = AuthModal;

AuthModal.initialized = false;
AuthModal.rendered = false;

AuthModal.prototype.handleClose = function () {
    $(document).on('hide.bs.modal', this.selector,  function (e) {
        if (!this.tokenObtained) e.preventDefault();
    }.bind(this));
};

AuthModal.prototype.render = function () {
    if (!AuthModal.rendered) {
        Modal.prototype.render.call(this);
        AuthModal.rendered = true;
    }
};

AuthModal.prototype.handleSubmit = function () {
    $(document).on('submit', this.selector,  function (e) {
        e.preventDefault();
        //make an api call
        const req = new RequestBackend(this.domain);
        const email = $(this.selector).find("input[type=email]").val();
        const pass = $(this.selector).find("input[type=password]").val();
        $.when(req.signin(email, pass)).then(
            function () {
                if (req.response && req.response.type === "HTTP_OK") {
                    this.authToken = req.response.details.encodedToken;
                    this.tokenObtained = true;
                    $(this.selector).modal("hide");
                    if (this.lastFailedQuery) $.ajax(this.lastFailedQuery);
                    this.events.fire("successful_signin", this.authToken);
                } else {
                    $(this.selector).find(".auth__message").text(this.deniedMessage).fadeIn();
                }
            }.bind(this),
            function() {
                $(this.selector).find(".auth__message").text(this.deniedMessage).fadeIn();
            }.bind(this)
        );
    }.bind(this))
};