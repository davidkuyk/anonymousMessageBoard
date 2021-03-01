'use strict';
const mongoose = require('mongoose');
const MongoClient = require('mongodb');
const ObjectId = MongoClient.ObjectId;
let db = mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = function (app) {

  let theBoard

  const threadSchema = new mongoose.Schema({
    board: String,
    text: String,
    created_on: Date,
    bumped_on: Date,
    reported: Boolean,
    delete_password: String,
    replies: [Object],
});

  const replySchema = new mongoose.Schema({
    text: String,
    created_on: Date,
    reported: Boolean,
    delete_password: String,
  })

  const Thread = mongoose.model('Thread', threadSchema);
  const Reply = mongoose.model('Reply', replySchema);
  
  app.route('/api/threads/:board')
    
    // GET
    .get(function (req, res){
      if (req.params.board !== undefined) {
        theBoard = req.params.board
      } else {
        theBoard = req.body.board
      }
      Thread.find({board: theBoard})
           .sort({bumped_on: -1})
           .limit(10)
           .select({delete_password: 0, reported: 0})
           .lean()
           .exec((error, data) => {
            if(error) {
              return console.log(error)
            } else {
              data.forEach((thread) => {
                
                thread['replycount'] = thread.replies.length

                thread.replies.sort((thread1, thread2) => {
                  return thread2.created_on - thread1.created_on
                })

                thread.replies = thread.replies.slice(0, 3)

                thread.replies.forEach((reply) => {
                  reply.delete_password = undefined
                  reply.reported = undefined
                })
              })
              return res.json(data);
            }
          })
    })

    // POST
    .post(function (req, res){

      if (req.params.board !== undefined) {
        theBoard = req.params.board
      } else {
        theBoard = req.body.board
      }

      let newThread = new Thread({
        board: theBoard,
        text: req.body.text,
        created_on: new Date().toUTCString(),
        bumped_on: new Date().toUTCString(),
        reported: false,
        delete_password: req.body.delete_password,
        replies: []
      });

      newThread.save((err, data) => {
          if(err) {
              return console.error(err);  
            } else {
              res.redirect(`/b/${theBoard}/?_id=${newThread._id}`)
            }
        })
    })

    // DELETE
    .delete(function (req, res){
      if(!req.body.thread_id) {return res.json({error: 'missing _id'})}
      Thread.findById(req.body.thread_id, (err, data) => {
          if(!err && data){

            if(data.delete_password === req.body.delete_password) {
              Thread.findByIdAndRemove(req.body.thread_id, (err, data) => {
                if(!err && data){
                  return res.json('Successfully deleted.')
                }
              })
            }else {
                    return res.json('Incorrect Password.')
            }
          } else {
            return res.json('Thread not found.')
          }
        })
      })

    // PUT (reporting a thread)
    .put(function (req, res){
      Thread.findByIdAndUpdate(
        req.body.thread_id,
        {reported: true},
        {new: true},
        (err, data) => {
          if(!err && data) {
            return res.json('Reported.')
          }
        }
      )
    })

  app.route('/api/replies/:board/:thread')

    .post(function (req, res){
      let threadId = req.body.thread_id
      let newReply = new Reply({
        text: req.body.text,
        created_on: new Date().toUTCString(),
        reported: false,
        delete_password: req.body.delete_password
      });
      var bumpDate = new Date().toUTCString()

      Thread.findByIdAndUpdate(
        threadId,
        {bumped_on: bumpDate, $push: {replies: newReply}},
        {new: true},
        (error, data) => {
          if(!error && data){
            res.redirect(`/b/${data.board}/${threadId}`)
          }
          else {
            console.log(error)
          }
        }
        )
    })
    
  app.route('/api/replies/:board')
    
    // POST
    .post(function (req, res){
      let threadId = req.body.thread_id
      let newReply = new Reply({
        text: req.body.text,
        created_on: new Date().toUTCString(),
        reported: false,
        delete_password: req.body.delete_password
      });
      var bumpDate = new Date().toUTCString()

      Thread.findByIdAndUpdate(
        threadId,
        {bumped_on: bumpDate, $push: {replies: newReply}},
        {new: true},
        (error, data) => {
          if(!error && data){
            console.log('data.replies: ' + data.replies[0]._id)
            res.redirect(`/b/${data.board}/?new_reply_id=${data.replies[0]._id}`)
          }
          else {
            console.log(error)
          }
        }
        )
    })
    // GET
    .get(function (req, res){
      let threadID = req.query.thread_id

      if (req.params.board !== undefined) {
        theBoard = req.params.board
      } else {
        theBoard = req.body.board
      }
      Thread.find({board: theBoard, _id: threadID})
           .sort({bumped_on: -1})
           .select({delete_password: 0, reported: 0})
           .lean()
           .exec((error, data) => {
            if(error) {
              return console.log(error)
            } else {
              data.forEach((thread) => {
                
                thread['replycount'] = thread.replies.length

                thread.replies.sort((thread1, thread2) => {
                  return thread2.created_on - thread1.created_on
                })

                thread.replies.forEach((reply) => {
                  reply.delete_password = undefined
                  reply.reported = undefined
                })
              })
              return res.json(data);
            }
          })
    })

    //DELETE 
    .delete((request, response) => {
      Thread.findById(
        ObjectId(request.body.thread_id),
        (error, threadToUpdate) => {
        if(!error && threadToUpdate){

          let i
          for (i = 0; i < threadToUpdate.replies.length; i++) {

            if(threadToUpdate.replies[i]._id == request.body.reply_id){
              if(threadToUpdate.replies[i].delete_password == request.body.delete_password){
                const query = { _id: ObjectId(request.body.thread_id) };
                const updateDocument = {
                  $set: { "replies.$[item].text": "[deleted]" },
                };
                const options = {
                  arrayFilters: [
                    {
                      "item._id": ObjectId(request.body.reply_id),
                      "item.delete_password": request.body.delete_password
                    },
                  ],
                  new: true
                }
                Thread.updateOne(
                  query, 
                  updateDocument, 
                  options,
                  (error, data) => {
                    if(!error && data){
                      return response.json('Reply deleted.')
                    }
                    else {
                      console.log(error)
                      return response.json('Error.')
                    }
                  })
                } else{
                return response.json('Incorrect password.')
              }
            }
          }
        }
        }
      )
    })

    // PUT
    .put((request, response) => {
      Thread.findById(
        ObjectId(request.body.thread_id),
        (error, threadToUpdate) => {
        if(!error && threadToUpdate){

          let i
          for (i = 0; i < threadToUpdate.replies.length; i++) {

            if(threadToUpdate.replies[i]._id == request.body.reply_id){
                
                const query = { _id: ObjectId(request.body.thread_id) };
                const updateDocument = {
                  $set: { "replies.$[item].reported": true },
                };
                const options = {
                  arrayFilters: [
                    {
                      "item._id": ObjectId(request.body.reply_id)
                    },
                  ],
                  new: true
                }
                Thread.updateOne(
                  query, 
                  updateDocument, 
                  options,
                  (error, data) => {
                    if(!error && data){
                      return response.json('Reply reported.')
                    }
                    else {
                      console.log(error)
                      return response.json('Error.')
                    }
                  })
                } 
            }
          }
        })
        })

};
