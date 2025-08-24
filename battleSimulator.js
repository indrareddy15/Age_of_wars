const readline = require("readline");

// AgeOfWars class: Manages unit class advantages in medieval warfare
class AgeOfWars {
    static map = Object.freeze({
        Militia: ["Spearmen", "LightCavalry"],
        Spearmen: ["LightCavalry", "HeavyCavalry"],
        LightCavalry: ["FootArcher", "CavalryArcher"],
        HeavyCavalry: ["Militia", "FootArcher", "LightCavalry"],
        CavalryArcher: ["Spearmen", "HeavyCavalry"],
        FootArcher: ["Militia", "CavalryArcher"],
    });

    static hasAdvantage(attackerClass, defenderClass) {
        return (AgeOfWars.map[attackerClass] || []).includes(defenderClass);
    }
}

// Platoon class: Represents a military platoon with specific unit class and soldier count
class Platoon {
    constructor (unitClass, soldiers) {
        this.unitClass = unitClass;
        this.soldiers = Number(soldiers) || 0;
    }

    toString() {
        return `${this.unitClass}#${this.soldiers}`;
    }

    effectiveStrengthAgainst(opponent) {
        return AgeOfWars.hasAdvantage(this.unitClass, opponent.unitClass)
            ? this.soldiers * 2
            : this.soldiers;
    }

    outcomeAgainst(opponent) {
        const mine = this.effectiveStrengthAgainst(opponent);
        if (mine > opponent.soldiers) return "win";
        if (mine === opponent.soldiers) return "draw";
        return "loss";
    }
}

// Army class: Represents a complete army consisting of multiple platoons
class Army {
    constructor (platoons = []) {
        this.platoons = platoons;
    }

    static parse(entry) {
        if (!entry || typeof entry !== "string") return new Army([]);

        const parts = entry
            .split(";")
            .map((p) => p.trim())
            .filter(Boolean);

        const platoons = parts.map((part) => {
            const [unitClass = "", count = "0"] = part
                .split("#")
                .map((s) => s.trim());
            return new Platoon(unitClass, parseInt(count, 10) || 0);
        });

        return new Army(platoons);
    }

    toString() {
        return this.platoons.map((p) => p.toString()).join(";");
    }
}

// BattleSimulator class: Simulates battles between two armies
class BattleSimulator {
    constructor (ownArmy, opponentArmy) {
        this.own = ownArmy;
        this.opponent = opponentArmy;
        this.expectedPlatoons = 5; // FIXED: changed from 6 to 5
    }

    validate() {
        if (
            this.own.platoons.length !== this.expectedPlatoons ||
            this.opponent.platoons.length !== this.expectedPlatoons
        ) {
            throw new Error(
                `Both armies must contain exactly ${this.expectedPlatoons} platoons.`
            );
        }
    }

    findWinningArrangement() {
        this.validate();

        const perms = permutations(this.own.platoons);

        for (const perm of perms) {
            let wins = 0;

            for (let i = 0; i < perm.length; i++) {
                const outcome = perm[i].outcomeAgainst(this.opponent.platoons[i]);
                if (outcome === "win") wins++;
            }

            if (wins >= Math.ceil(this.expectedPlatoons / 2)) {
                return new Army(perm);
            }
        }

        return null;
    }
}

// Utility function: Generates all possible permutations of an array
function permutations(items) {
    if (items.length <= 1) return [items.slice()];

    const result = [];

    for (let i = 0; i < items.length; i++) {
        const [head] = items.splice(i, 1);

        for (const tailPerm of permutations(items)) {
            result.push([head, ...tailPerm]);
        }

        items.splice(i, 0, head);
    }

    return result;
}

// Console input function
function consoleApplication() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const ask = (q, cb) => rl.question(q, (answer) => cb(answer));

    // Adjusted to match 5-unit scenario
    const unitClasses = [
        "Militia",
        "Spearmen",
        "LightCavalry",
        "HeavyCavalry",
        "FootArcher"
    ];
    const ownParts = [];
    const oppParts = [];

    let index = 0;

    function askNext() {
        if (index >= unitClasses.length) {
            rl.close();

            const ownInput = ownParts.join(";");
            const opponentInput = oppParts.join(";");

            try {
                const own = Army.parse(ownInput);
                const opponent = Army.parse(opponentInput);
                const sim = new BattleSimulator(own, opponent);
                const winning = sim.findWinningArrangement();

                if (winning) {
                    console.log("\nWinner - " + winning.toString());
                    console.log("Looser - " + opponent.toString());
                } else {
                    console.log("\nThere is no chance of winning.");
                }
            } catch (err) {
                console.error("Error:", err.message);
            }
            return;
        }

        const unitClass = unitClasses[index];

        ask(`Enter the ${unitClass}: `, (ownCount) => {
            const ownCountNum = parseInt(ownCount.trim()) || 0;
            ownParts.push(`${unitClass}#${ownCountNum}`);

            ask(`Enter opponent ${unitClass}: `, (oppCount) => {
                const oppCountNum = parseInt(oppCount.trim()) || 0;
                oppParts.push(`${unitClass}#${oppCountNum}`);
                index++;
                askNext();
            });
        });
    }
    console.log("Enter soldier counts for each unit class:");
    askNext();
}

// Test function using sample data
function runSampleTest() {
    const ownStr = "Spearmen#10;Militia#30;FootArcher#20;LightCavalry#1000;HeavyCavalry#120";
    const oppStr = "Militia#10;Spearmen#10;FootArcher#1000;LightCavalry#120;CavalryArcher#100";

    const own = Army.parse(ownStr);
    const opp = Army.parse(oppStr);

    const sim = new BattleSimulator(own, opp);
    const winning = sim.findWinningArrangement();

    if (!winning) {
        console.log("TEST FAIL: expected a winning arrangement but none found.");
        return 1;
    }

    let wins = 0;
    for (let i = 0; i < winning.platoons.length; i++) {
        if (winning.platoons[i].outcomeAgainst(opp.platoons[i]) === "win") {
            wins++;
        }
    }

    if (wins >= Math.ceil(5 / 2)) {
        console.log("TEST PASS: found arrangement ->", winning.toString());
        return 0;
    }

    console.log("TEST FAIL: arrangement found but wins < majority");
    return 2;
}

// Entry point
if (require.main === module) {
    const arg = process.argv[2];

    if (arg === "test" || arg === "--test") {
        const code = runSampleTest();
        process.exit(code);
    } else {
        consoleApplication();
    }
}

module.exports = { AgeOfWars, Platoon, Army, BattleSimulator, permutations };
