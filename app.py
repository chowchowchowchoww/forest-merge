from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    empty_board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]

    return render_template(
        "index.html",
        board=empty_board,
        score=0
    )


if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0"
    )