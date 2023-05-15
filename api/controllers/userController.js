const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
require('dotenv').config()
const jwt = require('jsonwebtoken')



//DONT PUSH DONT PUSH DONT PUSH IN DEPLOYMENT
//*********************************************************** */
//this function is only for experiments and not for deployment
const registerUser = asyncHandler(async (req, res) => {
  try {
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(req.body.password, salt)
    const newUser = new userModel({
      name: req.body.name,
      user_ID: req.body.user_ID,
      password: hashedPassword,
    });
    await newUser.save().then((data) => {
      res.json(data)
    }).catch((err) => {
      console.log(err)
    })
  } catch (err) { console.log(err) }

}
)
//***************************************************************/





//student login but should be extended to SMP login in future
const loginUser = asyncHandler(async (req, res) => {

  const cookies = req.cookies //loading cookie from any previous login(current device) if it exists
  console.log('COOKIE from previous session %s',cookies)
  //get details from req
  const { user_ID, password } = req.body;
  //find the student from the database
  const foundUser = await userModel.findOne({ user_ID });
  //check with the credentials
  if (foundUser && (await bcrypt.compare(password, foundUser.password))) {

    const roles = Object.values(foundUser.roles)
    const userINFO = { user_ID: foundUser.user_ID, roles: roles }
    const accessToken = jwt.sign(userINFO, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '600s' }) //generating new accessToken
    //To accesss inner contents of accessToken in front end we will need jwt decode ...
    const newRefreshToken = jwt.sign(userINFO, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '86400s' }) //generating new refreshToken

    //if we find existing cookie on this device we move it 
    let newRefreshTokenArray =
      !cookies?.jwt
        ? foundUser.refreshToken
        : foundUser.refreshToken.filter(rt => rt !== cookies.jwt)

    //say a previous cookie existed we clear that cookie and add the newly generated refresh token     
    if (cookies?.jwt){
      const refreshToken = cookies.jwt;
      const foundToken = await userModel.findOne({refreshToken}).exec()

      if(!foundToken){
        console.log('Detected refresh token reuse at login')
        newRefreshTokenArray=[]
      }
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None'})
    }
    foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken]
    await foundUser.save().catch(err => console.log('Couldnt save refresh token')) 
    //We send the new refresh token as a cookie
    res.cookie('jwt', newRefreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'none' })
    res.json({ accessToken: accessToken }) // and we send the access token as a request
  } else {
    res.status(400);
    throw new Error("Invalid Credentials");
  }
});





//Add code for SMP login here
//------------------------
//------------------------
//





//for creating new access tokens once the old ones have expired 
//as well as implementing refresh token rotation
const refreshUser = async (req, res) => {
  //get details from req
  const cookies = req.cookies;
  console.log(cookies)
  //say we logged out previously, this would prevent from creating new access tokens
  if (!cookies?.jwt)
    return res.status(401).json({ 'message': 'No Refresh Token Found' })
  const refreshToken = cookies.jwt //if cookie exists we extract the refresh token from it 
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None'}) //after extarcting the refresh token we remove it

  //we find the user who has that particular refresh token
  const foundUser = await userModel.findOne({ refreshToken });

  //In case we dont find a user that would imply reuse detection
  //check if such a user exists
  if (!foundUser) {
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if(err) return res.status(403).json({"message":"cookie not found"}) //Forbidden
        const hackedUser = await userModel.findOne({ user_ID: decoded.user_ID }).exec()
        hackedUser.refreshToken = [] //essentially if we find reuse of refreshTokens , we will be removing all refreshTokens ever granted to that profile, and making them login to all the devices
        await hackedUser.save()
      })
    return res.status(403).json({'message':'cookie not found'})
  };

  //proceeds only if user was found else user needs to log back again to all of its devices
  const newRefreshTokenArray = foundUser.refreshToken.filter(rt => rt !== refreshToken) //basically we keep all the refresh tokens of other devices except our own one 

  //verifying the validity of the refresh token
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) { //if token expired
        console.log("Please Login again")
        foundUser.refreshToken = [...newRefreshTokenArray]
        await foundUser.save()
      }
      if (err || foundUser.user_ID + "" !== decoded.user_ID + "") { //if manipulation done
        console.log("Please Login again")
        return res.sendStatus(403)
      }

      //Generating new tokens
      const roles = Object.values(foundUser.roles)
      const userINFO = { user_ID: foundUser.user_ID, roles: roles }
      const accessToken = jwt.sign(userINFO, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '600s' })//generating new access token
      //refresh token rotation
      const newRefreshToken = jwt.sign(userINFO, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1d' })//generating new refresh token
      foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken] //we append everything to the refreshToken array in database
      await foundUser.save().catch(err => console.log('Couldnt save refresh token'))
      res.cookie('jwt', newRefreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000,  sameSite: 'none' })
      res.json(accessToken) //sending the new access token
    }
  )
};





//logging out
//refreshing user
const logoutUser = asyncHandler(async (req, res) => {


  //get details from req
  const cookies = req.cookies;
  if (!cookies?.jwt)
    return res.sendStatus(204)
  const refreshToken = cookies.jwt

  //find the student from the database
  const foundUser = await userModel.findOne({ refreshToken });
  //check with the credentials
  if (!foundUser) return res.sendStatus(204)
  foundUser.refreshToken = foundUser.refreshToken.filter(rt => rt !== refreshToken) //basically we keep all the refresh tokens of other devices except our own one 
  await foundUser.save()

  res.clearCookie('jwt', { httpOnly: true })   ///add secure:true during deployment
  console.log('works')
  res.json({ "message": "Cookie removed" })
});




module.exports = { registerUser, loginUser, refreshUser, logoutUser };