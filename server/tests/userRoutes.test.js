import chai from "chai";
import chaiHTTP from "chai-http";
import app from "../app.js"; //express server
const expect = chai.expect;

chai.use(chaiHTTP);

//describe / it (methods)
describe("Root Route", ()=>{
    //test -> label (first param), callback (done)
    it(("Its home Route"), (done)=>{
        chai.request(app)
            .get("/")
            .end((err, res)=>{ //expecting
                expect(res).to.have.status(200);
                expect(res.text).to.equal("Hello World");
                done();
            }) 
    })
})