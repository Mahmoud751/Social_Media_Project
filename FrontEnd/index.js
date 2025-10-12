const clientIo = io("http://localhost:3000/", {
    auth: { authorization: "Bearer Token" }
});
// const clientIo2 = io("http://localhost:3000/admin");

clientIo.on("connect", () => {
    console.log("Server Established Connection Successfully!");
});

clientIo.on("connect_error", (error) => {
    console.log(`Connection Error, ${error.message}`);
});

clientIo.on("sayHi", (data, callback) => {
    console.log(data);
    callback("Hello From Front-End");
});

// clientIo.on("product", (arg1, arg2) => {
//     console.log(arg1);
//     console.log(arg2);
// });

// clientIo.on("product1", (arg1, arg2) => {
//     console.log(arg1);
//     console.log(arg2);
// });

// clientIo.on("product2", (arg1, arg2) => {
//     console.log(arg1);
//     console.log(arg2);
// });

// clientIo.on("product3", (arg1, arg2) => {
//     console.log(arg1);
//     console.log(arg2);
// });

// clientIo.on("product4", (arg1, arg2) => {
//     console.log(arg1);
//     console.log(arg2);
// });