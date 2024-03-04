const chai = require('chai');
const chaiHTTP =  require('chai-http');
const app =  require("../app.js");
const expect = chai.expect;

chai.use(chaiHTTP);

describe("Root Router", ()=>{
    it("Its Home Router", (done)=>{
        chai.request(app)
            .get("/")
            .end((err,res)=>{
                expect(res).to.have.status(200);
                expect(res.text).to.equal("Hello World");
                done();
            })
    })
})

