

const express = require('express');
const router = express.Router();



const userSessionHandling=require('../middleware/userSessionHandling')


const userManagement=require('../controller/userManagement')  

router.get('/' ,userSessionHandling.isBlockedNow,  userManagement.home)




router.get('/loginpage',userSessionHandling.requireNotUser,userManagement.userLogin)  
router.post('/login',userManagement.userLoginPost)
router.get('/signuppage',userSessionHandling.requireNotUser,userManagement.userSignupGet)
router.post('/signup',userManagement.userSignupPost)
router.get('/otpPage',  userSessionHandling.otpSessionNewUser , userManagement.otpPage)
router.post('/otpverified',     userManagement.otpVerificationPost)



// router.get('/resendOtp', userSessionHandling.otpSession,userManagement.otpPage)
router.get('/resendOtp', userSessionHandling.resendOtpSession,userManagement.otpPage)
router.get('/logout',userManagement.logout)
router.get('/userProfile',userSessionHandling.isBlockedNow2, userManagement.userProfile)
router.get('/userAddAddress',   userSessionHandling.isBlockedNow2,userManagement.userAddAddress )
router.post('/editAddress',   userSessionHandling.isBlockedNow2,userManagement.editAddress )
router.get('/orderStatus',    userSessionHandling.isBlockedNow2,userManagement.userOrderStatus)





router.get('/changePassword',userSessionHandling.isBlockedNow,userManagement.updatePassword)
router.get('/forgotPassword',   userSessionHandling.isBlockedNow,userManagement.updatePassword)



router.post('/update-password',    userManagement.updatePasswordPost)


router.post('/updateUserName',    userManagement.changeName)



///////////////////////////////////////////
////////////////PRODUCT ROUTES////////////////////////
///////////////////////////////////

const productManagement=require('../controller/productManagement')


router.get('/category/:id',   userSessionHandling.isBlockedNow,    productManagement.productListUser)

router.post('/category/fetch/:id', userSessionHandling.isBlockedNow, ((req,res,next)=>{
    console.log(123456789);
    next()
}
),   productManagement.fetchData)

// router.post('/category/:id/ascending/',userSessionHandling.isBlockedNow,productManagement.priceSortDescending)
// router.post('/category/:id/descending',userSessionHandling.isBlockedNow,productManagement.priceSortAscending)

router.post('/category/:id/ascending/',userSessionHandling.isBlockedNow,productManagement.priceSortDescending2)
router.post('/category/:id/descending',userSessionHandling.isBlockedNow,productManagement.priceSortAscending2)

router.post('/category/:id/searchProduct',userSessionHandling.isBlockedNow,productManagement.searchProduct)



router.get('/productdetails/:id',  userSessionHandling.isBlockedNow,  productManagement.productDetail)
router.get('/wallet', userSessionHandling.isBlockedNow2,userManagement.wallet)



const couponManagement = require('../controller/couponController.js')
router.get('/availableCoupons', userSessionHandling.isBlockedNow2,couponManagement.availableCoupon)




const invoiceController = require('../controller/invoiceController.js')
router.get('/download-invoice/:orderId', userSessionHandling.isBlockedNow2,invoiceController.downloadInvoice)






module.exports = router;










