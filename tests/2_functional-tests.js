const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let testThreadId
  let testThreadId2
  let testReplyId
  let testPassword = 'testpass'
  let testPassword2 = 'testpass2'

  test('Create New Thread', (done) => {
    chai.request(server)
    .post('/api/threads/test')
    .send({
      board: 'test',
      text: 'test text',
      delete_password: testPassword
    })
    .end((err, res) => {
      assert.equal(res.status, 200)
      createdThreadId = res.redirects[0].split("?_id=")[1];
      testThreadId = createdThreadId
      done();
    })
  })

  test('Create another thread (for later testing)', (done) => {
    chai.request(server)
    .post('/api/threads/test')
    .send({
      board: 'test2',
      text: 'test text 2',
      delete_password: testPassword2
    })
    .end((err, res) => {
      assert.equal(res.status, 200)
      createdThreadId = res.redirects[0].split("?_id=")[1];
      testThreadId2 = createdThreadId
      done();
    })
  })

  test('Post reply', (done) => {
    chai.request(server)
    .post('/api/replies/test')
    .send({
      board: 'test',
      thread_id: testThreadId,
      text: 'test reply text',
      delete_password: testPassword
    })
    .end((err, res) => {
      assert.equal(res.status, 200)
      let createdReplyId = res.redirects[0].split("?new_reply_id=")[1]
      testReplyId = createdReplyId
      done();
    })
    
  })

  test('Get request', (done) => {
    chai.request(server)
    .get('/api/threads/test')
    .send()
    .end((err, res) => {
      assert.isArray(res.body)
      assert.isAtMost(res.body.length, 10)
      let firstThread = res.body[0]
      assert.isUndefined(firstThread.delete_password)
      assert.isAtMost(firstThread.replies.length, 3)
      done()
    })
  })

  test('Get reply from thread', (done) => {
    chai.request(server)
    .get('/api/replies/test')
    .query({thread_id: testThreadId})
    .send()
    .end((err, res) => {
      let thread = res.body[0]
      assert.equal(thread._id, testThreadId)
      assert.isUndefined(thread.delete_password)
      assert.isArray(thread.replies)
      done()
    })
  })

  test('Report a reply', (done) => {
    chai.request(server)
    .put('/api/replies/test')
    .send({
      thread_id: testThreadId,
      reply_id: testReplyId
    })
    .end((err, res) => {
      assert.equal(res.body, 'Reply reported.')
      done()
    })
  })

  test('Delete reply attempt with incorrect password', (done) => {
    chai.request(server)
    .delete('/api/replies/test')
    .send({
      thread_id: testThreadId,
      reply_id: testReplyId,
      delete_password: 'incorrectPassword'
    })
    .end((err, res) => {
      assert.equal(res.status, 200)
      assert.equal(res.body, 'Incorrect password.')
      done()
    })
  })

  test('Delete a reply', (done) => {
    chai.request(server)
    .delete('/api/replies/test')
    .send({
      thread_id: testThreadId,
      reply_id: testReplyId,
      delete_password: testPassword
    })
    .end((err, res) => {
      assert.equal(res.status, 200)
      assert.equal(res.body, 'Reply deleted.')
      done()
    })
  })

  test('Report a thread', (done) => {
    chai.request(server)
    .put('/api/threads/test')
    .send({
      thread_id: testThreadId
    })
    .end((err, res) => {
      assert.equal(res.body, 'Reported.')
      done()
    })
  })

  test('Delete a thread', (done) => {
    chai.request(server)
    .delete('/api/threads/test')
    .send({
      thread_id: testThreadId,
      delete_password: testPassword
    })
    .end((err, res) => {
      assert.equal(res.body, 'Successfully deleted.')
      done()
    })
  })

  test('Delete attempt with incorrect password', (done) => {
    chai.request(server)
    .delete('/api/threads/test')
    .send({
      thread_id: testThreadId2,
      delete_password: 'incorrectPassword'
    })
    .end((err, res) => {
      assert.equal(res.body, 'Incorrect Password.')
      done()
    })
  })
  
});