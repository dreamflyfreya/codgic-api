/* /test/functional/controllers/auth.ts */

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import chaiHttp = require('chai-http');
import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as sinon from 'sinon';

import * as AuthController from './../../../src/controllers/auth';
import { errorHandler } from './../../../src/middlewares/error';
import * as AuthModel from './../../../src/models/auth';
import * as UserModel from './../../../src/models/user';

import * as AuthStub from './../../utils/stubs/models/auth';
import * as UserStub from './../../utils/stubs/models/user';

chai.use(chaiAsPromised);
chai.use(chaiHttp);

describe('AuthController: Verify authentication information', async () => {

  const app = new Koa();
  let stubvalidateUserCredential: sinon.SinonStub;
  let stubGenerateToken: sinon.SinonStub;

  before(async () => {

    app.use(errorHandler);
    app.use(bodyParser());

    // Stub validateUserCredential()
    stubvalidateUserCredential = await sinon.stub(AuthModel, 'validateUserCredential')
      .callsFake(AuthStub.fakevalidateUserCredential);

    // Stub generateToken()
    stubGenerateToken = await sinon.stub(AuthModel, 'generateToken')
      .callsFake(AuthStub.fakeGenerateToken);

    app.use(AuthController.verifyAuthInfo);

  });

  after (async () => {

    await stubvalidateUserCredential.restore();
    await stubGenerateToken.restore();

  });

  it('should return a valid jwt if authentication info is correct', async () => {

    return chai.expect(chai.request(app.listen())
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        username: 'zk',
        password: 'CorrectPassword',
      }))
      .to.be.fulfilled
      .and.eventually.deep.include({
        status: 200,
        body: {
          token: 'ValidToken',
        },
      });

  });

  it('should throw bad request if username is missing', async () => {

    return chai.expect(chai.request(app.listen())
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        password: 'CorrectPassword',
      })
      .catch((err) => {
        return err.response;
      }))
      .to.be.fulfilled
      .and.eventually.deep.include({
        status: 400,
        body: {
          error: 'Bad Request',
        },
      });

  });

  it('should throw bad request if password is missing', async () => {

    return chai.expect(chai.request(app.listen())
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send({
        username: 'zk',
      })
      .catch((err) => {
        return err.response;
      }))
      .to.be.fulfilled
      .and.eventually.deep.include({
        status: 400,
        body: {
          error: 'Bad Request',
        },
      });

  });

});

describe('AuthController: Refresh token', async () => {

  let app: Koa;
  let stubGetUserInfo: sinon.SinonStub;
  let stubGenerateToken: sinon.SinonStub;

  before(async () => {

    // Stub validateUserCredential()
    stubGetUserInfo = await sinon.stub(UserModel, 'getUserInfo')
      .callsFake(UserStub.fakeGetUserInfo);

    // Stub generateToken()
    stubGenerateToken = await sinon.stub(AuthModel, 'generateToken')
      .callsFake(AuthStub.fakeGenerateToken);

  });

  beforeEach(async () => {

    app = new Koa();

    app.use(errorHandler);
    app.use(bodyParser());

  });

  after (async () => {

    await stubGetUserInfo.restore();
    await stubGenerateToken.restore();

  });

  it('should return a new jwt if given token is valid', async () => {

    // We don't really have to provide a valid jwt here.
    // Validating jwt is koa-jwt's job, and koa-jwt has passed his own tests.
    // So let's assume koa-jwt has successfully decrypted the given jwt.
    // Here we simply mock koa-jwt's work.

    app.use(async (ctx, next) => {
      ctx.state.user = {
        id: 1,
        email: 'fuckzk@codgi.cc',
        username: 'zk',
        privilege: 1,
      };
      await next();
    });

    app.use(AuthController.refreshToken);

    return chai.expect(chai.request(app.listen()).get('/'))
      .to.be.fulfilled
      .and.eventually.deep.include({
        status: 200,
        body: {
          token: 'ValidToken',
        },
      });

  });

  it('should throw error if given token is invalid or has expired', async () => {

    app.use(AuthController.refreshToken);

    return chai.expect(chai.request(app.listen()).get('/').catch((err) => {
      return err.response;
    })).to.be.fulfilled
    .and.eventually.deep.include({
        status: 401,
        body: {
          error: 'Unauthorized',
        },
      });
  });

});
