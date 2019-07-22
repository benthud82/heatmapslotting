<!DOCTYPE html>

<html>
    <style>
        body, html {
            height: 100%;
            margin: 0;
            font: 400 15px/1.8 "Lato", sans-serif;
            color: #777;
        }

        .bgimg-1, .bgimg-2, .bgimg-3 {
            position: relative;
            opacity: 0.65;
            background-position: center;
            background-repeat: no-repeat;
            background-size: cover;

        }
        .bgimg-1 {
            background-image: url("images/heatmap.jpg");
            height: 100%;
        }

        .caption {
            position: absolute;
            left: 0;
            top: 50%;
            width: 100%;
            text-align: center;
            color: #000;
        }

        .caption span.border {
            background-color: #111;
            color: #fff;
            padding: 18px;
            font-size: 25px;
            letter-spacing: 10px;
        }

        h3 {
            letter-spacing: 5px;
            text-transform: uppercase;
            font: 20px "Lato", sans-serif;
            color: #111;
        }
    </style>
    <head>
        <?php include 'googlekey/googlekey.php'; ?>
        <?php include 'includes/headerincludes.php'; ?>
        <meta charset="UTF-8">
        <title>Title of the document</title>
    </head>
    <body>
        <div class="bgimg-1">
            <div class="caption">
                <span class="border">HEATMAP</span><br>
                <span class="border">SLOTTING</span>
            </div>
        </div>

        <div class="wrapper container">
            <div class="row">
                <div class="col-md-3 ">
                    test222
                </div>
                <div class="col-md-9">
                    TEST
                </div>
            </div>
        </div>

    </body>


</html>