from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from extensions import init_extensions

from blueprints.auth import bp as auth_bp
from blueprints.users import bp as users_bp
from blueprints.accounts import bp as accounts_bp
from blueprints.transactions import bp as tx_bp
from blueprints.budgets import bp as budgets_bp
from blueprints.investments import bp as inv_bp
from blueprints.analytics import bp as analytics_bp
from blueprints.savings_goals import bp as goals_bp


def create_app():
    app = Flask(__name__)

    CORS(app, resources={r"/*": {"origins": "http://localhost:4200"}}, supports_credentials=True)

    app.config.from_object(Config)

    init_extensions(app)

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(error=str(e)), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Route not found"), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify(error="Method not allowed"), 405

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify(error="Unprocessable entity — check your request data"), 422

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify(error="Internal server error"), 500

    @app.get("/__health")
    def health():
        import extensions as ext
        return jsonify({
            "status":      "ok",
            "db_is_ready": bool(ext.mongo),
            "db_name":     getattr(ext.mongo, "name", None)
        })

    @app.get("/")
    def home():
        return jsonify({
            "message": "MyFinanceTracker API is running",
            "health":  "/__health",
            "authentication": {
                "note":     "Pass JWT in 'x-access-token' header OR 'Authorization: Bearer <token>' header",
                "login":    "POST /auth/login  — HTTP Basic Auth OR JSON body {email, password}",
                "logout":   "POST /auth/logout — blacklists current token",
                "register": "POST /auth/register"
            },
            "routes": {
                "auth": {
                    "POST /auth/register": "Register new user",
                    "POST /auth/login":    "Login (Basic Auth or JSON) — returns JWT",
                    "POST /auth/logout":   "Logout — cancels token",
                    "GET  /auth/me":       "Get own profile",
                    "PUT  /auth/me":       "Update own profile"
                },
                "users (admin only)": {
                    "GET    /users/":                   "List all users",
                    "POST   /users/":                   "Create a user",
                    "GET    /users/<id>":               "Get specific user",
                    "PUT    /users/<id>":               "Update user",
                    "DELETE /users/<id>":               "Delete user + all data",
                    "GET    /users/admin/transactions": "All transactions system-wide",
                    "GET    /users/admin/analytics":    "System-wide financial analytics"
                },
                "accounts": {
                    "GET    /accounts/":     "List my accounts",
                    "POST   /accounts/":     "Create account",
                    "GET    /accounts/<id>": "Get specific account",
                    "PUT    /accounts/<id>": "Update account",
                    "DELETE /accounts/<id>": "Delete account + its transactions"
                },
                "transactions": {
                    "GET    /transactions/":     "List transactions (?start&end&category&type&account_id&page&size)",
                    "POST   /transactions/":     "Add transaction",
                    "GET    /transactions/<id>": "Get specific transaction",
                    "DELETE /transactions/<id>": "Delete transaction"
                },
                "budgets": {
                    "GET    /budgets/":                   "List budgets (?month=YYYY-MM)",
                    "POST   /budgets/":                   "Create/update budget",
                    "GET    /budgets/analysis/<YYYY-MM>": "Budget vs actual spending",
                    "DELETE /budgets/<id>":               "Delete budget entry"
                },
                "investments": {
                    "GET    /investments/":           "List investments",
                    "POST   /investments/":           "Add investment",
                    "GET    /investments/analytics/": "Profit/loss analysis by asset and type",
                    "PUT    /investments/<id>":       "Update investment",
                    "DELETE /investments/<id>":       "Delete investment"
                },
                "analytics": {
                    "GET /analytics/spending/monthly":  "Monthly income & expense summary",
                    "GET /analytics/top-categories":    "Top spending categories (?limit=5)",
                    "GET /analytics/income-vs-expense": "Income vs expense comparison",
                    "GET /analytics/portfolio-value":   "Investment portfolio value & P&L",
                    "GET /analytics/budgets/<YYYY-MM>": "Budget vs actual for a month"
                },
                "savings_goals": {
                    "GET    /savings-goals/":     "List goals",
                    "POST   /savings-goals/":     "Create goal",
                    "PUT    /savings-goals/<id>": "Update goal",
                    "DELETE /savings-goals/<id>": "Delete goal"
                }
            }
        })

    app.register_blueprint(auth_bp,      url_prefix="/auth")
    app.register_blueprint(users_bp,     url_prefix="/users")
    app.register_blueprint(accounts_bp,  url_prefix="/accounts")
    app.register_blueprint(tx_bp,        url_prefix="/transactions")
    app.register_blueprint(budgets_bp,   url_prefix="/budgets")
    app.register_blueprint(inv_bp,       url_prefix="/investments")
    app.register_blueprint(analytics_bp, url_prefix="/analytics")
    app.register_blueprint(goals_bp,     url_prefix="/savings-goals")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)