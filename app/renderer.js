const { Counter, __origin__ } = require("core");

console.log("imported", { Counter }, "from", __origin__);

for (const value of new Counter.create()) {
    console.log(value);
    if (value >= 10) break;
}
