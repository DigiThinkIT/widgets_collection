// login.js
// don't remove this line (used in test)

window.disable_signup = {{ disable_signup and "true" or "false" }};

window.login = {};

login.bind_events = function() {
	$(window).on("hashchange", function() {
		login.route();
	});

	$(".form-login").on("submit", function(event) {
		event.preventDefault();
		var args = {};
		args.cmd = "login";
		args.usr = ($("#login_email").val() || "").trim();
		args.pwd = $("#login_password").val();
		args.device = "desktop";
		if(!args.usr || !args.pwd) {
			frappe.msgprint(__("Both login and password required"));
			return false;
		}
		login.call(args);
		return false;
	});

	$(".form-signup").on("submit", function(event) {
		event.preventDefault();
		var args = {};
		args.cmd = "widgets_collection.login.sign_up";
		args.email = ($("#signup_email").val() || "").trim();
		args.redirect_to = frappe.utils.get_url_arg("redirect-to") || '';
		args.first_name = ($("#signup_firstname").val() || "").trim();
		args.last_name = ($("#signup_lastname").val() || "").trim();
		args.pwd = ($("#signup_password").val() || "").trim();
		args.pwd_check = ($("#signup_password_check").val() || "").trim();

		if(!args.email || !valid_email(args.email) || !args.first_name || !args.last_name) {
			frappe.msgprint(__("Valid email and name required"));
			return false;
		}

		if(args.pwd != args.pwd_check) {
			frappe.msgprint(__("The passwords you entered did not match"))
		} else {
			login.call(args);
			return false;
		}
	});

	$(".form-forgot").on("submit", function(event) {
		event.preventDefault();
		var args = {};
		args.cmd = "frappe.core.doctype.user.user.reset_password";
		args.user = ($("#forgot_email").val() || "").trim();
		if(!args.user) {
			frappe.msgprint(__("Valid Login id required."));
			return false;
		}
		login.call(args);
		return false;
	});

	$(".btn-ldpa-login").on("click", function(){
		var args = {};
		args.cmd = "{{ "" if not ldap_settings else ldap_settings.method }}";
		args.usr = ($("#login_email").val() || "").trim();
		args.pwd = $("#login_password").val();
		args.device = "desktop";
		if(!args.usr || !args.pwd) {
			frappe.msgprint(__("Both login and password required"));
			return false;
		}
		login.call(args);
		return false;
	});
}


login.route = function() {
	var route = window.location.hash.slice(1);
	if(!route) route = "login";
	login[route]();
}

login.login = function() {
	$("form").toggle(false);
	$(".form-login").toggle(true);
}

login.forgot = function() {
	$("form").toggle(false);
	$(".form-forgot").toggle(true);
}

login.signup = function() {
	$("form").toggle(false);
	$(".form-signup").toggle(true);
}


// Login
login.call = function(args) {
	return frappe.call({
		type: "POST",
		args: args,
		freeze: true,
		statusCode: login.login_handlers
	});
}

login.login_handlers = (function() {
	var get_error_handler = function(default_message) {
		return function(xhr, data) {
			if(xhr.responseJSON) {
				data = xhr.responseJSON;
			}

			var message = default_message;
			if (data._server_messages) {
				message = ($.map(JSON.parse(data._server_messages || '[]'), function() {
					// temp fix for messages sent as dict
					try {
						return JSON.parse(v).message;
					} catch (e) {
						return v;
					}
				}) || []).join('<br>') || default_message;
			}

			frappe.msgprint(message);
		};
	}

	var login_handlers = {
		200: function(data) {
			if(data.message=="Logged In") {
				if ( !frappe.on_login_redirect_handler ) {
					window.location.href = frappe.utils.get_url_arg("redirect-to") || data.home_page;
				} else {
					frappe.on_login_redirect_handler(frappe.utils.get_url_arg("redirect-to") || data.home_page);
				}
			} else if(data.message=="No App") {
				if(localStorage) {
					var last_visited =
						localStorage.getItem("last_visited")
						|| frappe.utils.get_url_arg("redirect-to");
					localStorage.removeItem("last_visited");
				}

				var redirect_to = data.home_page;
				var ignore_last_visited = false;

				if(data.redirect_to) {
					redirect_to = data.redirect_to;
					ignore_last_visited = true;
				}

				if(!ignore_last_visited && last_visited && last_visited != "/login") {
					redirect_to = last_visited;
				}

				if ( !frappe.on_login_redirect_handler ) {
					window.location.href = redirect_to;
				} else {
					frappe.on_login_redirect_handler(redirect_to);
				}

			} else if(["#signup", "#forgot"].indexOf(window.location.hash)!==-1) {
				frappe.msgprint(data.message);
			}
		},
		401: get_error_handler(__('<div align="center">Sorry! That login does not exist. <br><br><b>We have updated our website</b><br><br>If you had an account with us previously try your <b>email address instead.</b><br>And/or click the <b><i>Forgot Password?</i></b> link below the password field to reset your password.</div>')),
		417: get_error_handler(__("Oops! Something went wrong"))
	};

	return login_handlers;
})();

frappe.ready(function() {
	login.bind_events();

	if (!window.location.hash) {
		window.location.hash = "#login";
	} else {
		$(window).trigger("hashchange");
	}

	$(".form-signup, .form-forgot").removeClass("hide");
	$(document).trigger('login_rendered');
});
