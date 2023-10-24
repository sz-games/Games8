let ysdk;
let player;
let level = getCookie('level');
function initSDK() {
    YaGames.init({
        adv: {
            onAdvClose: wasShown => {
                console.info('adv closed!');
                window.focus();
            }
        }
    })
    .then(_ysdk => {
        ysdk = _ysdk;
        ysdk.adv.showFullscreenAdv();
        ysdk.getPlayer().then(_player => {
            player = _player;
            player.getStats(
                ['level']
            ).then((item) => {
                console.log('data is get');
                if (item.level) {
                    if (item.level > level) {
                        level = item.level;
                        setCookie('level', level);
                    }
                }
            });
        });
    });
}
function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    let lsData = localStorage.getItem(name);
    if (matches) {
        return decodeURIComponent(matches[1]);
    }
    else if (lsData != null) {
        return lsData;
    }
    return 0;
}
function setCookie(name, value) {
    let options = {
        path: '/',
        secure: true,
        samesite: 'none',
        'max-age': 2592000
    };
    var dateExp = new Date();
    dateExp.setTime(dateExp.getTime() + 2592000000);
    options.expires = dateExp.toUTCString();
    let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);
    for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];
        if (optionValue !== true) {
            updatedCookie += "=" + optionValue;
        }
    }
    document.cookie = updatedCookie;
    localStorage.setItem(name, value);
}
window.onload = function() {
    paper.setup("canvas");
    with (paper) {
        let center = view.center.clone();
        let mouse = view.center.clone();
        let height = Math.min(view.size.height, view.size.width);
        let width = Math.max(view.size.height, view.size.width);
        let fps = 47;
        let now;
        let then = Date.now();
        let interval = 1000 / fps;
        let delta;
        let dead = true;
        let sky = new Path.Rectangle(new Point(0, 0), view.size);
        sky.fillColor = {
            gradient: {
                stops: ['#0D47A1', '#1565C0']
            },
            origin: new Point(width / 2, height / 2),
            destination: new Point(width / 2, height)
        };
        let grads = [
            ["#2263ad", "#3a81ca", "#8ac7f9"],
            ["#29a0c2", "#ffffe5"],
            ["#6992d1", "#efe384"],
            ["#19469d", "#6e86ab", "#bec1c3", "#dbc6a2", "#efe384"],
            ["#d982d1", "#eb957f"],
            ["#3a4f6e", "#655e75", "#d3808a", "#f4aca0", "#f8f3c9"],
            ["#3384d5", "#87ccf6", "#a6e6ff", "#f3faff"]
        ];
        let bases = [];
        let cloud = [];
        let pauseText = document.getElementById('pause-text');
        let gText = document.getElementById('start');
        let tText = document.getElementById('touch');
        let start = false;
        let g = height / 5225;
        let dotRadius = height / 50;
        let dots = [];
        let sticks = [];
        let minDist = 7 * dotRadius;
        let maxDist = 12 * dotRadius;
        let canDot = true;
        let mainColor = 'black';
        class Dot {
            constructor(x, y, mass) {
                this.pos = new Point(x, y);
                this.oldpos = new Point(x, y);
                this.friction = 0.985;
                this.groundFriction = 0.05;
                this.gravity = new Point(0, g);
                this.mass = (mass || 1);
                this.pinned = false;
                this.radius = dotRadius;
                this.shape = new Path.Circle(this.pos, this.radius);
                this.shape.insertBelow(wall);
                this.shape.fillColor = mainColor;
            }
            update() {
                let vel = this.pos.subtract(this.oldpos).add(this.gravity).multiply(this.friction);
                if (vel.length > 0.0000001) {
                    for (let i = 0; i < bases.length; ++i) {
                        if (this.pos.x + this.radius >= bases[i].bounds.topLeft.x && this.pos.x - this.radius <= bases[i].bounds.topRight.x
                            && this.pos.y + this.radius >= bases[i].bounds.topRight.y) {
                            vel.x *= this.groundFriction;
                            vel.y *= this.groundFriction;
                        }
                    }
                }
                this.oldpos = this.pos.clone();
                this.pos = this.pos.add(vel);
            }
            constrain() {
                if (this.pos.x - this.radius < 0) {
                    this.pos.x = this.radius;
                }
                if (this.pos.x + this.radius > width) {
                    this.pos.x = width - this.radius;
                }
                if (this.pos.y - this.radius > height) {
                    gameOver();
                    return;
                }
                for (let i = 0; i < bases.length; ++i) {
                    if (this.pos.x + this.radius >= bases[i].bounds.topLeft.x && this.pos.x - this.radius <= bases[i].bounds.topRight.x) {
                        if (this.pos.y + this.radius >= bases[i].bounds.topRight.y) {
                            if (this.pos.x > bases[i].position.x) {
                                if (Math.abs(this.pos.y - bases[i].bounds.topRight.y + this.radius) < Math.abs(this.pos.x - bases[i].bounds.topRight.x - this.radius)) {
                                    this.pos.y = bases[i].bounds.topRight.y - this.radius;
                                }
                                else {
                                    this.pos.x = bases[i].bounds.topRight.x + this.radius;
                                }
                            }
                            else {
                                if (Math.abs(this.pos.y - bases[i].bounds.topRight.y + this.radius) < Math.abs(this.pos.x - bases[i].bounds.topLeft.x + this.radius)) {
                                    this.pos.y = bases[i].bounds.topRight.y - this.radius;
                                }
                                else {
                                    this.pos.x = bases[i].bounds.topLeft.x - this.radius;
                                }
                            }
                        }
                        else if (i == bases.length - 1 && dots.length > 1) {
                            if (level == 0) {
                                if (dots.length > 2) {
                                    gameOver(true);
                                    return;
                                }
                            }
                            else {
                                gameOver(true);
                                return;
                            }
                        }
                    }
                }
                this.render();
            }
            render() {
                this.shape.position = this.pos;
            }
        }
        function isAllowed(pos) {
            if (pos.x - dotRadius < 0 || pos.x + dotRadius > width) {
                return false;
            }
            for (let i = 0; i < bases.length; ++i) {
                if (pos.x + dotRadius >= bases[i].bounds.topLeft.x && pos.x - dotRadius <= bases[i].bounds.topRight.x
                    && pos.y + dotRadius >= bases[i].bounds.topRight.y) {
                    return false;
                }
            }
            return true;
        }
        class Stick {
            constructor(p1, p2, stiffness, length) {
                this.startDot = p1;
                this.endDot = p2;
                if (stiffness === undefined) {
                    this.stiffness = 2;
                }
                else {
                    this.stiffness = stiffness;
                }
                if (length === undefined) {
                    this.length = this.startDot.pos.subtract(this.endDot.pos).length;
                }
                else {
                    this.length = length;
                }
                this.shape = new Path.Line(this.startDot.pos, this.endDot.pos);
                this.shape.strokeWidth = Math.max(Math.round(dotRadius / 2), 1);
                this.shape.insertBelow(wall);
                this.shape.strokeColor = mainColor;
            }
            update() {
                let dx = this.endDot.pos.x - this.startDot.pos.x;
                let dy = this.endDot.pos.y - this.startDot.pos.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let diff = (this.length - dist) / dist * this.stiffness;
                let offsetx = dx * diff * 0.5;
                let offsety = dy * diff * 0.5;
                let m1 = this.startDot.mass + this.endDot.mass;
                let m2 = this.startDot.mass / m1;
                m1 = this.endDot.mass / m1;
                if (!this.startDot.pinned) {
                    this.startDot.pos.x -= offsetx * m1;
                    this.startDot.pos.y -= offsety * m1;
                }
                if (!this.endDot.pinned) {
                    this.endDot.pos.x += offsetx * m2;
                    this.endDot.pos.y += offsety * m2;
                }
                this.render();
            }
            render() {
                this.shape.remove();
                this.shape = new Path.Line(this.startDot.pos, this.endDot.pos);
                this.shape.strokeWidth = Math.max(Math.round(dotRadius / 2), 1);
                this.shape.insertBelow(wall);
                this.shape.strokeColor = mainColor;
            }
        }
        const ITERATIONS = 3;
        class Cloud {
            constructor (x, y) {
                this.position = new Point(x, y);
                this.rand = Math.random();
                this.shape = new Raster(this.position, new Size(270, 100));
                this.shape.scale((0.3 + 0.7 * this.rand) * height / 1000);
                this.shape.setImageData(cloud[Math.round(Math.random())]);
                this.shape.opacity = 0.2 + 0.8 * this.rand;
                this.shape.insertAbove(sky);
            }
            update() {
                this.position.x -= 0.3 * this.rand;
                let pos = this.position;
                while (pos.x > width + this.shape.bounds.width / 2) {
                    pos.x -= width + this.shape.bounds.width;
                }
                while (pos.x < -this.shape.bounds.width / 2) {
                    pos.x += width + this.shape.bounds.width;
                }
                this.shape.position = pos;
            }
        }
        let loadings = 0;
        function loading() {
            if (loadings === 3) {
                wall.tween(
                    { opacity: 1 },
                    { opacity: 0.5 },
                    1000
                );
                if (level === 0) {
                    gText.innerHTML = 'TRAINING';
                }
                else {
                    gText.innerHTML = 'LEVEL ' + level;
                }
                tText.innerHTML = 'TOUCH TO START';
                restartGame();
                start = true;
            }
            else {
                gText.innerHTML = 'LOADING ' + Math.round(100 * loadings / 3) + '%';
            }
        }
        let mouseDot = new Path.Circle(center, dotRadius);
        mouseDot.fillColor = mainColor;
        let tutor0 = new Path();
        let tutor1 = new Path();
        project.importSVG('images/tutor0.svg', tutor0Onload);
        project.importSVG('images/tutor1.svg', tutor1Onload);
        function tutor0Onload(item) {
            tutor0 = item.clone();
            item.remove();
            tutor0.visible = false;
            tutor0.insertBelow(mouseDot);
            ++loadings;
            loading();
        }
        function tutor1Onload(item) {
            tutor1 = item.clone();
            item.remove();
            tutor1.visible = false;
            tutor1.insertBelow(mouseDot);
            ++loadings;
            loading();
        }
        let wall = new Path.Rectangle(new Point(0, 0), view.size);
        wall.fillColor = 'black';
        let cloudsRaster = new Raster('images/clouds.png');
        cloudsRaster.visible = false;
        let clouds = [];
        cloudsRaster.onLoad = function() {
            ++loadings;
            for (let i = 0; i < 2; ++i) {
                cloud.push(cloudsRaster.getImageData(new Rectangle(new Point(i * 270, 0), new Size(270, 100))));
            }
            loading();
        };
        getData();
        pauseText.onclick = function(event) {
            if (start && dead) {
                wall.visible = false;
                pauseText.style.display = 'none';
                wall.opacity = 1;
                dead = false;
            }
        }
        view.onMouseMove = function(event) {
            if (!dead) {
                mouse = event.point.clone();
                mouseDot.position = mouse;
            }
        }
        view.onMouseUp = function(event) {
            mouse = event.point;
            if (!dead && isAllowed(event.point) && canDot) {
                let curr;
                for (let d of dots) {
                    if (d.pos.subtract(event.point).length >= minDist && d.pos.subtract(event.point).length <= maxDist) {
                        if (canDot) {
                            curr = new Dot(event.point.x, event.point.y);
                            canDot = false;
                            dots.push(curr);
                        }
                        sticks.push(new Stick(d, curr));
                    }
                }
                setTimeout(() => {
                    canDot = true;
                }, 500);
            }
        }
        view.onResize = function(event) {
            sky.bounds = view.bounds;
            wall.bounds = view.bounds;
            center = view.center.clone();
            for (let i = 0; i < bases.length; ++i) {
                let x = bases[i].position.x;
                let y = bases[i].position.y;
                bases[i].bounds.width = view.size.width * bases[i].bounds.width / width;
                bases[i].bounds.height = view.size.height * bases[i].bounds.height / height;
                bases[i].position.x = view.size.width * x / width;
                bases[i].position.y = view.size.height * y / height;
            }
            for (let i = 0; i < dots.length; ++i) {
                let x = dots[i].pos.x;
                let y = dots[i].pos.y;
                dots[i].pos.x = view.size.width * x / width;
                dots[i].pos.y = view.size.height * y / height;
                x = dots[i].oldpos.x;
                y = dots[i].oldpos.y;
                dots[i].oldpos.x = view.size.width * x / width;
                dots[i].oldpos.y = view.size.height * y / height;
            }
            for (let i = 0; i < sticks.length; ++i) {
                sticks[i].length = sticks[i].startDot.pos.subtract(sticks[i].endDot.pos).length;
            }
            height = view.size.height;
            width = view.size.width;
            dotRadius = height / 50;
            minDist = 7 * dotRadius;
            maxDist = 12 * dotRadius;
            for (let i = 0; i < dots.length; ++i) {
                dots[i].radius = dotRadius;
                dots[i].shape.bounds.width = 2 * dotRadius;
                dots[i].shape.bounds.height = 2 * dotRadius;
            }
            mouseDot.bounds.width = 2 * dotRadius;
            mouseDot.bounds.height = 2 * dotRadius;
            tutor0.bounds.height = height;
            tutor0.bounds.width = height;
            tutor0.position = center;
            tutor1.bounds.height = height;
            tutor1.bounds.width = height;
            tutor1.position = center;
        }
        let paths = [];
        view.onFrame = function(event) {
            now = Date.now();
            delta = now - then;
            if (delta > interval) {
                if (!dead) {
                    for (let i = 0; i < clouds.length; ++i) {
                        clouds[i].update();
                    }
                    for (let i = 0; i < ITERATIONS; ++i) {
                        for (let d of dots) {
                            if (d.update() === false) {
                                return false;
                            }
                            d.constrain();
                        }
                        for (let s of sticks) {
                            s.update();
                        }
                    }
                    for (let p of paths) {
                        p.remove();
                    }
                    paths = [];
                    if (isAllowed(mouse)) {
                        mouseDot.fillColor = mainColor;
                        for (let d of dots) {
                            if (d.pos.subtract(mouse).length >= minDist && d.pos.subtract(mouse).length <= maxDist) {
                                let path = new Path.Line(mouse, d.pos);
                                path.strokeColor = mainColor;
                                path.strokeWidth = Math.max(Math.round(dotRadius / 2), 1);
                                paths.push(path);
                            }
                        }
                    }
                    else {
                        mouseDot.fillColor = 'red';
                    }
                }
                then = now - (delta % interval);
            }
        }
        function gameOver(nLevel) {
            dead = true;
            if (ysdk) {
                ysdk.adv.showFullscreenAdv({
                    callbacks: {
                        onClose: function(wasShown) {
                            // some action after close
                        },
                        onError: function(error) {
                            // some action on error
                        }
                    }
                });
            }
            for (let c of clouds) {
                c.shape.remove();
            }
            for (let d of dots) {
                d.shape.remove();
            }
            for (let s of sticks) {
                s.shape.remove();
            }
            for (let p of paths) {
                p.remove();
            }
            for (let b of bases) {
                b.remove();
            }
            wall.visible = true;
            pauseText.style.display = 'flex';
            if (nLevel === true) {
                ++level;
                gText.innerHTML = 'LEVEL ' + level;
                tText.innerHTML = 'TOUCH TO START';
                setData();
            }
            else {
                gText.innerHTML = 'GAME OVER';
                tText.innerHTML = 'TOUCH TO RESTART';
            }
            restartGame();
            wall.tween(
                { opacity: 1 },
                { opacity: 0.5 },
                1000
            );
        }
        function restartGame() {
            sky.fillColor.gradient.stops = grads[level % grads.length];
            mouse = center;
            mouseDot.position = center;
            mouseDot.fillColor = mainColor;
            clouds = [];
            for (let i = 0; i < 5; ++i) {
                clouds.push(new Cloud(Math.random() * width, 50 + Math.random() * height / 3));
            }
            if (level === 0) {
                tutor0.bounds.height = height;
                tutor0.bounds.width = height;
                tutor0.position = center;
                tutor0.visible = true;
            }
            else if (level === 1) {
                tutor0.visible = false;
                tutor1.bounds.height = height;
                tutor1.bounds.width = height;
                tutor1.position = center;
                tutor1.visible = true;
            }
            else {
                tutor0.visible = false;
                tutor1.visible = false;
            }
            paths = [];
            dots = [];
            sticks = [];
            bases = [];
            createMap();
            dots.push(new Dot(bases[0].bounds.topCenter.x, bases[0].bounds.topCenter.y - 100));
        }
        let maps = [
            [[1, 0.3]],
            [[0.5, 0.1], [0.5, 0.6]],
            [[0.4, 0.3], [0.2, 0], [0.4, 0.3]],
            [[0.4, 0.2], [0.2, 0], [0.4, 0.5]],
            [[0.35, 0.2], [0.3, 0], [0.35, 0.7]],
            [[0.3, 0.2], [0.4, 0], [0.3, 0.5]],
            [[0.2, 0.2], [0.15, 0], [0.2, 0.2], [0.15, 0], [0.3, 0.6]],
            [[0.4, 0.7], [0.2, 0], [0.4, 0.1]],
            [[0.3, 0.6], [0.4, 0], [0.3, 0.1]],
            [[0.2, 0.6], [0.15, 0], [0.2, 0.2], [0.15, 0], [0.3, 0.1]],
            [[0.2, 0.5], [0.2, 0], [0.2, 0.5], [0.2, 0], [0.2, 0.5]],
            [[0.2, 0.3], [0.1, 0], [0.1, 0.3], [0.1, 0], [0.1, 0.3], [0.2, 0], [0.2, 0.3]],
            [[0.2, 0.3], [0.2, 0], [0.1, 0.4], [0.1, 0], [0.1, 0.4], [0.2, 0], [0.1, 0.3]],
            [[0.2, 0.2], [0.3, 0], [0.1, 0.6], [0.3, 0], [0.1, 0.2]],
            [[0.2, 0.2], [0.3, 0], [0.1, 0.6], [0.3, 0], [0.1, 0.8]],
            [[0.2, 0.2], [0.2, 0], [0.1, 0.7], [0.4, 0], [0.1, 0.8]],
            [[0.2, 0.1], [0.2, 0], [0.1, 0.8], [0.4, 0], [0.1, 0.8]],
            [[0.2, 0.1], [0.3, 0], [0.1, 0.1], [0.3, 0], [0.1, 0.8]],
            [[0.2, 0.5], [0.3, 0], [0.1, 0.1], [0.3, 0], [0.1, 0.8]],
            [[0.2, 0.6], [0.2, 0], [0.1, 0.1], [0.4, 0], [0.1, 0.8]],
            [[0.15, 0.5], [0.25, 0], [0.05, 0.3], [0.2, 0], [0.05, 0.3], [0.25, 0], [0.05, 0.5]],
            [[0.15, 0.7], [0.2, 0], [0.05, 0.2], [0.3, 0], [0.05, 0.2], [0.2, 0], [0.05, 0.7]],
            [[0.15, 0.7], [0.35, 0], [0.05, 0.2], [0.4, 0], [0.05, 0.7]],
            [[0.15, 0.2], [0.3, 0], [0.05, 0.5], [0.45, 0], [0.05, 0.8]],
            [[0.2, 0.3], [0.3, 0], [0.1, 0.3], [0.3, 0], [0.1, 0.3]],
            [[0.15, 0.5], [0.3, 0], [0.05, 0.5], [0.45, 0], [0.05, 0.8]],
            [[0.15, 0.6], [0.25, 0], [0.05, 0.1], [0.5, 0], [0.05, 0.6]],
            [[0.15, 0.5], [0.35, 0], [0.05, 0.1], [0.4, 0], [0.05, 0.5]],
        ];
        function createMap() {
            let map = maps[level % maps.length];
            let w = 0;
            for (let i = 0; i < map.length; ++i) {
                if (map[i][1] !== 0) {
                    let base = new Path.Rectangle(new Point(w * width, height - map[i][1] * height), new Size(map[i][0] * width, map[i][1] * height));
                    base.fillColor = '#6D4C41';
                    base.insertBelow(mouseDot);
                    bases.push(base);
                }
                w += map[i][0];
            }
        }
        function getData() {
            level = Math.max(level, getCookie('level'));
            if (player) {
                player.getStats(
                    ['level']
                ).then((item) => {
                    console.log('data is get');
                    if (item.level) {
                        if (item.level > level) {
                            level = item.level;
                            setCookie('level', level);
                        }
                    }
                });
            }
        }
        function setData() {
            if (player) {
                player.getStats(
                    ['level']
                ).then((item) => {
                    console.log('data is get to set');
                    if (item.level) {
                        if (item.level > level) {
                            level = item.level;
                            setCookie('level', level);
                        }
                    }
                    player.setStats({
                        level: level
                    }).then(() => {
                        console.log('data is set');
                    });
                });
            }
            setCookie('level', level);
        }
    }
}