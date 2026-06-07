// const CategoryDB=require('../../models/category')
const CategoryDB = require("../models/category");
const productDB = require("../models/product");
const CartDB = require("../models/cart");
const multer = require("multer");
const path = require("path");
const upload = multer({ dest: "public/uploads/" });
const fetchCategoryMiddleware = require("../middleware/fetchCategoryData");
const mongoose = require("mongoose");
const { error } = require("console");

const determineIsLogged = (session) => {
  return session.user
    ? session.user.name
    : session.userNew
    ? session.userNew.name
    : null;
};

const productListAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get page number from query parameter
    const productsPerPage = 5;
    const skip = (page - 1) * productsPerPage;

    const productList = await productDB
      .find()
      .populate("categoryId") // Populate category information

      .skip(skip)
      .limit(productsPerPage);
    const totalProductsCount = await productDB.countDocuments();

    const totalPages = Math.ceil(totalProductsCount / productsPerPage);

    if (productList.length > 0) {
      res.render("admin/product-list", {
        productList,
        totalPages,
        currentPage: page,
      });
    } else {
      res.render("admin/category-list");
    }
  } catch (err) {
    res.redirect("/error");
  }
};

const addProduct = async (req, res) => {
  try {
    const categoryList = await CategoryDB.find(
      { isAvailable: true },
      { name: 1, _id: 1 }
    );
    const multerError = req.session.multerError;
    req.session.multerError = null;
    res.render("admin/add-product", { categoryList, multerError });
  } catch (err) {
    res.redirect("/error");
  }
};

const productadded = async (req, res) => {
  let imageCount = 4;
  const existingProductId = req.params.id ?? null;

  if (req.params.id) {
    const existingProductId = req.params.id;
    const existingProduct = await productDB.findById(existingProductId);
    const ExistingImgCount = existingProduct.image.length;
    imageCount = 4 - ExistingImgCount;
  }

  upload.array("images", imageCount)(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (req.params.id) {
        req.session.multerError = true;
        return res.redirect(`/admin/productUpdate/${existingProductId}`);
      } else {
        req.session.multerError = true;
        return res.redirect("/admin/addProduct");
      }
    } else if (err) {
      return res.status(500).send({ message: "Server error" });
    }

    try {
      const newImages = req.files.map((file) => file.path.substring(6));

      if (!req.params.id) {
        console.log(req.body.price);

        const newProduct = {
          name: req.body.productName,
          price: req.body.productPrice,
          stock: req.body.productStock,
          categoryId: req.body.productCategory,
          description: req.body.productDescription,
          image: newImages,
          discountPercentage: req.body.offerInput,
        };

        if (req.body.offerExpiryDate && req.body.offerExpiryDate !== "") {
          const parts = req.body.offerExpiryDate.split("/");
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Months are zero-based in JavaScript
          const year = parseInt(parts[2]);
          newProduct.expiryDate = new Date(year, month, day);
        }

        await productDB.insertMany([newProduct]);
        req.session.productAdded = newProduct;
      } else {
        const productId = req.params.id;
        const existingProduct = await productDB.findById(productId);

        const updateProduct = {
          name: req.body.productName,
          price: req.body.productPrice,
          stock: req.body.productStock,
          categoryId: req.body.productCategory,
          description:
            req.body.productDescription.trim() !== ""
              ? req.body.productDescription
              : existingProduct.description,
          image:
            newImages.length > 0 &&
            existingProduct &&
            existingProduct.image.length > 0
              ? [...newImages, ...existingProduct.image]
              : newImages.length > 0
              ? newImages
              : existingProduct.image.length > 0
              ? existingProduct.image
              : null,
          discountPercentage: req.body.offerInput,
        };

        if (req.body.offerExpiryDate !== "") {
          const parts = req.body.offerExpiryDate.split("/");
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Months are zero-based in JavaScript
          const year = parseInt(parts[2]);
          updateProduct.expiryDate = new Date(year, month, day);
        } else if (
          existingProduct.expiryDate &&
          req.body.offerExpiryDate == ""
        ) {
          updateProduct.expiryDate = null;
        }

        const editing = await productDB.findByIdAndUpdate(
          productId,
          updateProduct
        );
      }

      return res.redirect("/admin/productlist");
    } catch (error) {
      return res.status(500).send({ message: "Error adding product" });
    }
  });
};

//-=-=-=-=-

//productUnlist admin
const productUnlist = async (req, res) => {
  try {
    const productId = req.params.id;
    const productishere = await productDB.find({ _id: productId });
    const nowproduct = await productDB.updateOne(
      { _id: productId },
      { $set: { isAvailable: false } }
    );
    res.redirect("/admin/productlist");
  } catch (err) {
    res.redirect("/error");
  }
};
const productDelete = async (req, res) => {
  try {
    const productId = req.params.id;
    const productishere = await productDB.find({ _id: productId });
    const nowproduct = await productDB.deleteOne({ _id: productId });
    const removeFromCart = await CartDB.deleteOne({ productId: productId });
    res.redirect("/admin/productlist");
  } catch (err) {
    res.redirect("/error");
  }
};

const productList = async (req, res) => {
  try {
    const productId = req.params.id;
    const productishere = await productDB.find({ _id: productId });
    const nowproduct = await productDB.updateOne(
      { _id: productId },
      { $set: { isAvailable: true } }
    );
    res.redirect("/admin/productlist");
  } catch (err) {
    res.redirect("/error");
  }
};

const productUpdate = async (req, res) => {
  const multerError = req.session.multerError;
  req.session.multerError = null;
  try {
    const productId = req.params.id;
    const editProduct = await productDB.findById(productId);

    const categoryList = await CategoryDB.find(
      { isAvailable: true },
      { name: 1, _id: 1 }
    );
    res.render("admin/edit-product", {
      editProduct,
      multerError,
      categoryList,
    });
  } catch (err) {
    res.redirect("/error");
  }
};

const productUpdatePost = async (req, res) => {
  try {
    const updateProduct = req.params.id;
    const updatedProduct = await productDB
      .findById(updateProduct)
      .select("name isAvailable image");
  } catch (err) {
    res.redirect("/error");
  }
};

const productImgDelete = async (req, res) => {
  try {
    const productObjectId = req.params.id;
    const imgUrl = req.params.imgUrl;
    const imgPath = `\\uploads\\${imgUrl}`; // Assuming your database stores URLs with forward slashes
    const img = await productDB.updateOne(
      { _id: productObjectId },
      { $pull: { image: imgPath } }
    );
    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" }); // Send an error response
  }
};

const productDetail = async (req, res) => {
  const isLogged = determineIsLogged(req.session);
  const { primaryCategories, otherCategories } =
    await fetchCategoryMiddleware.fetchCategories();

  try {
    const productId = req.params.id;

    const product = await productDB
      .findOne({ _id: productId, isAvailable: true })
      .populate("categoryId");

    if (!product) {
      throw new Error("Product not found"); // Handle case where product doesn't exist
    }

    const currentDate = new Date();
    const categoryId = product.categoryId._id.toString();
    const categoryDiscount = product.categoryId.discountPercentage;
    let offerPrice = product.price;

    // Check if product has a discount and it hasn't expired
    if (
      product.discountPercentage &&
      (!product.expiryDate || currentDate <= product.expiryDate)
    ) {
      offerPrice -= (offerPrice * product.discountPercentage) / 100; // Apply product discount
    } else if (product.categoryId.startDate && product.categoryId.endDate) {
      // Check if product falls within category discount offer period
      const startDate = new Date(product.categoryId.startDate);
      const endDate = new Date(product.categoryId.endDate);
      if (currentDate >= startDate && currentDate <= endDate) {
        offerPrice -= (offerPrice * categoryDiscount) / 100; // Apply category discount
      }
    } else {
      offerPrice -= (offerPrice * categoryDiscount) / 100; // Apply category discount if offer is permanent
    }

    const session = req.session.cartProduct ?? null;
    delete req.session.cartProduct;

    let wishlistsession = req.session.wishlist ?? null;
    delete req.session.wishlist;

    res.render("user/product-detail", {
      session,
      wishlistsession,
      productDetails: product,
      offerPrice,
      isLogged,
      primaryCategories,
      otherCategories,
    });
  } catch (err) {
    res.redirect("/error");
  }
};

// const productListUser = async (req, res) => {
//   try {
//     const isLogged = determineIsLogged(req.session);
//     const { primaryCategories, otherCategories } = await fetchCategoryMiddleware.fetchCategories();
//     const categoryName = req.params.id;
//     const categoryData = req.params.id.toUpperCase();

//     const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter, default to page 1
//     const limit = 4; // Number of items per page

//     // Find the category by name to get its ID
//     const category = await CategoryDB.findOne({ name: categoryData, isAvailable: true });
//     if (!category) {
//       throw new Error('Category not found'); // Handle case where category doesn't exist
//     }
//     const categoryId = category._id;

//     const totalProductsCount = await productDB.countDocuments({
//       isAvailable: true,
//       categoryId: categoryId, // Match products by categoryId
//     });
//     const totalPages = Math.ceil(totalProductsCount / limit);
//     const offset = (page - 1) * limit;

//     const currentDate = new Date(); // Get the current date

//     const products = await productDB
//       .find({ isAvailable: true, categoryId: categoryId }) // Match products by categoryId
//       .skip(offset)
//       .limit(limit)
//       .populate('categoryId'); // Populate category information

//     const productsWithOfferPrice = await Promise.all(products.map(async (product) => {
//       const categoryId = product.categoryId._id.toString();
//       const categoryDiscount = product.categoryId.discountPercentage;
//       let offerPrice = product.price;
//       let applyCategoryDiscount = true;

//       // Check if the product has a discount (offer) and it hasn't expired
//       if (product.discountPercentage && (!product.expiryDate || currentDate <= product.expiryDate)) {
//         // Apply product discount if available
//         offerPrice -= (offerPrice * product.discountPercentage) / 100;
//         // If product offer exists, do not apply category offer
//         applyCategoryDiscount = false;
//       }

//       if (applyCategoryDiscount) {
//         // Check if the current date is within the discount offer period
//         if (product.categoryId.startDate && product.categoryId.endDate) {
//           const startDate = new Date(product.categoryId.startDate);
//           const endDate = new Date(product.categoryId.endDate);
//           if (currentDate >= startDate && currentDate <= endDate) {
//             // Apply category discount if available and no product discount is applicable
//             offerPrice -= (offerPrice * categoryDiscount) / 100;
//           }
//         } else {
//           // If start and end dates are not available, consider the offer as permanent
//           // Apply category discount if available and no product discount is applicable
//           offerPrice -= (offerPrice * categoryDiscount) / 100;
//         }
//       }

//       return {
//         ...product.toObject(), // Convert Mongoose document to plain object
//         offerPrice: offerPrice,
//         normalPrice: product.price // Include the normal price
//       };
//     }));

//     res.render("user/product-list", {
//       isLogged,
//       product: productsWithOfferPrice, // Corrected "product" to "products"
//       primaryCategories,
//       otherCategories,
//       totalPages,
//       currentPage: page,
//       categoryName,
//     });
//   } catch (err) {
//     res.redirect('/error');
//   }
// };

const productListUser = async (req, res) => {
  try {
    const isLogged = determineIsLogged(req.session);
    const { primaryCategories, otherCategories } =
      await fetchCategoryMiddleware.fetchCategories();
    const categoryName = req.params.id;
    const categoryData = req.params.id.toUpperCase();

    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const searchQuery = req.query.search || "";
    const sortOrder = req.query.sort || ""; // 'asc' or 'desc'

    const category = await CategoryDB.findOne({
      name: categoryData,
      isAvailable: true,
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const categoryId = category._id;

    const filter = {
      isAvailable: true,
      categoryId: categoryId,
      ...(searchQuery && { name: { $regex: searchQuery, $options: "i" } }),
    };

    const sort = {};
    if (sortOrder === "asc") sort.price = 1;
    else if (sortOrder === "desc") sort.price = -1;

    const totalProductsCount = await productDB.countDocuments(filter);
    const totalPages = Math.ceil(totalProductsCount / limit);
    const offset = (page - 1) * limit;

    const currentDate = new Date();

    const products = await productDB
      .find(filter)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .populate("categoryId");

    const productsWithOfferPrice = await Promise.all(
      products.map(async (product) => {
        const categoryDiscount = product.categoryId.discountPercentage;
        let offerPrice = product.price;
        let applyCategoryDiscount = true;

        if (
          product.discountPercentage &&
          (!product.expiryDate || currentDate <= product.expiryDate)
        ) {
          offerPrice -= (offerPrice * product.discountPercentage) / 100;
          applyCategoryDiscount = false;
        }

        if (applyCategoryDiscount) {
          if (product.categoryId.startDate && product.categoryId.endDate) {
            const startDate = new Date(product.categoryId.startDate);
            const endDate = new Date(product.categoryId.endDate);
            if (currentDate >= startDate && currentDate <= endDate) {
              offerPrice -= (offerPrice * categoryDiscount) / 100;
            }
          } else {
            offerPrice -= (offerPrice * categoryDiscount) / 100;
          }
        }

        return {
          ...product.toObject(),
          offerPrice,
          normalPrice: product.price,
        };
      })
    );

    res.render("user/product-list", {
      isLogged,
      product: productsWithOfferPrice,
      primaryCategories,
      otherCategories,
      totalPages,
      currentPage: page,
      categoryName,
    });
  } catch (err) {
    res.redirect("/error");
  }
};

const fetchData = async (req, res) => {
  const descending = parseInt(req.body.descending);
  const categoryData = req.params.id.toUpperCase();
  const minValueParsing = req.body.minValue;
  const maxValueParsing = req.body.maxValue;

  const minValue = parseInt(minValueParsing);
  const maxValue = parseInt(maxValueParsing);

  const searchTerm = req.body.searchTerm || null;
  const regex = /₹(\d+)\s*-\s*₹(\d+)/;

  try {
    const page = parseInt(req.body.page) || 1; // Get the page number from the query parameter, default to page 1

    const limit = 4; // Number of items per page
    const offset = (page - 1) * limit;

    const category = await CategoryDB.findOne({
      name: categoryData,
      isAvailable: true,
    });
    if (!category) {
      throw new Error("Category not found"); // Handle case where category doesn't exist
    }
    const categoryId = category._id;

    const pipeline = [
      {
        $match: {
          categoryId: categoryId,
          price: { $gte: minValue, $lte: maxValue },
          isAvailable: true,
          // name: searchTerm
          //   ? { $regex: new RegExp(searchTerm, "i") }
          //   : { $exists: true }, // Include name field conditionally
          ...(searchTerm && { name: searchTerm }), // Include name field conditionally
        },
      },
      {
        $sort: {
          price: descending || 1,
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page: page } }],
          data: [{ $skip: offset }, { $limit: limit }],
        },
      },
    ];
    const [{ metadata, data }] = await productDB.aggregate(pipeline);
    const totalDocs = metadata.length > 0 ? metadata[0].total : 0;
    const totalPages = Math.ceil(totalDocs / limit);

    res.json({
      sortedProducts: data,
      currentPage: page,
      totalPages,
      categoryData,
      minValue,
      maxValue,
      searchTerm,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// const priceSortDescending = async (req, res) => {
//   const { value, searchTerm } = req.body.value;

//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = value.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);

//   const categoryData = req.params.id.toUpperCase();
//   const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter, default to page 1
//   const limit = 4; // Number of items per page

//   try {

//     const category = await CategoryDB.findOne({ name: categoryData,isAvailable:true });
//     if (!category) {
//       throw new Error('Category not found'); // Handle case where category doesn't exist
//     }
//     const categoryId = category._id;

//     const totalProductsCount = await productDB.countDocuments({
//       isAvailable: true,
//       categoryId: categoryId,
//       price: { $gte: minValue, $lte: maxValue }, // Price range condition
//       ...(searchTerm && { name: searchTerm }), // Include name field conditionally
//     });

//     const countValue = totalProductsCount;

//     const totalPages = Math.ceil(countValue / limit);

//     const offset = (page - 1) * limit;

//     const pipeline2 = [
//       {
//         $match: {
//           categoryId: categoryId,
//           price: { $gte: minValue, $lte: maxValue },
//           isAvailable: true,
//           ...(searchTerm && { name: searchTerm }), // Include name field conditionally
//         },
//       },
//       {
//         $sort: {
//           price: -1, // 1 for ascending, -1 for descending
//         },
//       },
//     ];
//     const sortedProducts = await productDB
//       .aggregate(pipeline2)
//       .skip(offset)
//       .limit(limit);
//     res.json({
//       sortedProducts,
//       totalPages,
//       currentPage: page,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm,
//       descending:-1,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });

//   }
// };

// const priceSortAscending = async (req, res) => {

//   const { value, searchTerm } = req.body.value;

//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = value.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);
//   const categoryData = req.params.id.toUpperCase();
//   const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter, default to page 1
//   const limit = 4; // Number of items per page

//   try {

//     const category = await CategoryDB.findOne({ name: categoryData,isAvailable:true });
//     if (!category) {
//       throw new Error('Category not found'); // Handle case where category doesn't exist
//     }
//     const categoryId = category._id;

//     const totalProductsCount = await productDB.countDocuments({
//       isAvailable: true,
//       categoryId: categoryId,
//       price: { $gte: minValue, $lte: maxValue }, // Price range condition
//       ...(searchTerm && { name: searchTerm }), // Include name field conditionally
//     });
//     const countValue = totalProductsCount;
//     const totalPages = Math.ceil(countValue / limit);
//     const offset = (page - 1) * limit;
//     const pipeline2 = [
//       {
//         $match: {
//           categoryId: categoryId,
//           price: { $gte: minValue, $lte: maxValue },
//           isAvailable: true,
//           ...(searchTerm && { name: searchTerm }), // Include name field conditionally
//         },
//       },
//       {
//         $sort: {
//           price: 1, // 1 for ascending, -1 for descending
//         },
//       },
//     ];
//     const sortedProducts = await productDB
//       .aggregate(pipeline2)
//       .skip(offset)
//       .limit(limit);
//     res.json({
//       sortedProducts,
//       totalPages,
//       currentPage: page,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });

//   }
// };

// const searchProduct = async (req, res) => {
//   const categoryData = req.params.id.toUpperCase();
//   const searchValue = req.body.searchTerm;
//   const priceString = req.body.value;
//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = priceString.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);

//   try {
//     const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter, default to page 1
//     const limit = 4; // Number of items per page
//     const offset = (page - 1) * limit;

//     const category = await CategoryDB.findOne({ name: categoryData,isAvailable:true });
//     if (!category) {
//       throw new Error('Category not found'); // Handle case where category doesn't exist
//     }
//     const categoryId = category._id;

//     const pipeline = [
//       {
//         $match: {
//           categoryId: categoryId,
//           price: { $gte: minValue, $lte: maxValue },
//           isAvailable: true,
//           name: { $regex: searchValue, $options: "i" }, // Case-insensitive search
//         },
//       },
//       {
//         $sort: {
//           price: 1, // 1 for ascending, -1 for descending
//         },
//       },
//       {
//         $facet: {
//           metadata: [{ $count: "total" }, { $addFields: { page: page } }],
//           data: [{ $skip: offset }, { $limit: limit }],
//         },
//       },
//     ];

//     const [{ metadata, data }] = await productDB.aggregate(pipeline);

//     const totalDocs = metadata.length > 0 ? metadata[0].total : 0;
//     const totalPages = Math.ceil(totalDocs / limit);

//     res.json({
//       searchProducts: data,
//       currentPage: page,
//       totalPages,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm: searchValue,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// compute offer price code

const computeOfferPrice = async (product, currentDate) => {
  const categoryDiscount = product.categoryId.discountPercentage;
  let offerPrice = product.price;
  let applyCategoryDiscount = true;

  if (
    product.discountPercentage &&
    (!product.expiryDate || currentDate <= product.expiryDate)
  ) {
    offerPrice -= (offerPrice * product.discountPercentage) / 100;
    applyCategoryDiscount = false;
  }

  if (applyCategoryDiscount) {
    if (product.categoryId.startDate && product.categoryId.endDate) {
      const startDate = new Date(product.categoryId.startDate);
      const endDate = new Date(product.categoryId.endDate);
      if (currentDate >= startDate && currentDate <= endDate) {
        offerPrice -= (offerPrice * categoryDiscount) / 100;
      }
    } else {
      offerPrice -= (offerPrice * categoryDiscount) / 100;
    }
  }

  return {
    ...product,
    offerPrice,
    normalPrice: product.price,
  };
};

const priceSortAscending = async (req, res) => {
  const { value, searchTerm } = req.body.value;
  const regex = /₹(\d+)\s*-\s*₹(\d+)/;
  const match = value.match(regex);
  const minValue = parseInt(match[1], 10);
  const maxValue = parseInt(match[2], 10);
  const categoryData = req.params.id.toUpperCase();
  const page = parseInt(req.query.page) || 1;
  const limit = 4;
  const offset = (page - 1) * limit;

  try {
    const category = await CategoryDB.findOne({
      name: categoryData,
      isAvailable: true,
    });
    if (!category) throw new Error("Category not found");

    const products = await productDB
      .find({
        categoryId: category._id,
        price: { $gte: minValue, $lte: maxValue },
        isAvailable: true,
        ...(searchTerm && { name: searchTerm }),
      })
      .sort({ price: 1 })
      .skip(offset)
      .limit(limit)
      .populate("categoryId");

    const currentDate = new Date();
    const productsWithOffer = await Promise.all(
      products.map((p) => computeOfferPrice(p.toObject(), currentDate))
    );

    const totalCount = await productDB.countDocuments({
      categoryId: category._id,
      price: { $gte: minValue, $lte: maxValue },
      isAvailable: true,
      ...(searchTerm && { name: searchTerm }),
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      sortedProducts: productsWithOffer,
      totalPages,
      currentPage: page,
      categoryData,
      minValue,
      maxValue,
      searchTerm,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const priceSortDescending = async (req, res) => {
  const { value, searchTerm } = req.body.value;
  const regex = /₹(\d+)\s*-\s*₹(\d+)/;
  const match = value.match(regex);
  const minValue = parseInt(match[1], 10);
  const maxValue = parseInt(match[2], 10);
  const categoryData = req.params.id.toUpperCase();
  const page = parseInt(req.query.page) || 1;
  const limit = 4;
  const offset = (page - 1) * limit;

  try {
    const category = await CategoryDB.findOne({
      name: categoryData,
      isAvailable: true,
    });
    if (!category) throw new Error("Category not found");

    const products = await productDB
      .find({
        categoryId: category._id,
        price: { $gte: minValue, $lte: maxValue },
        isAvailable: true,
        ...(searchTerm && { name: searchTerm }),
      })
      .sort({ price: -1 })
      .skip(offset)
      .limit(limit)
      .populate("categoryId");

    const currentDate = new Date();
    const productsWithOffer = await Promise.all(
      products.map((p) => computeOfferPrice(p.toObject(), currentDate))
    );

    const totalCount = await productDB.countDocuments({
      categoryId: category._id,
      price: { $gte: minValue, $lte: maxValue },
      isAvailable: true,
      ...(searchTerm && { name: searchTerm }),
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      sortedProducts: productsWithOffer,
      totalPages,
      currentPage: page,
      categoryData,
      minValue,
      maxValue,
      searchTerm,
      descending: -1,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};






// const priceSortDescending2 = async (req, res) => {
//   const { value, searchTerm } = req.body.value;
//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = value.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);
//   const categoryData = req.params.id.toUpperCase();
//   const page = parseInt(req.query.page) || 1;
//   const limit = 4;
//   const offset = (page - 1) * limit;

//   try {
//     const category = await CategoryDB.findOne({
//       name: categoryData,
//       isAvailable: true,
//     });
//     if (!category) throw new Error("Category not found");

//     // Change exact match to case-insensitive partial match regex
//     const searchQuery = {
//       categoryId: category._id,
//       price: { $gte: minValue, $lte: maxValue },
//       isAvailable: true,
//       ...(searchTerm && { name: { $regex: searchTerm, $options: "i" } }),
//     };

//     const products = await productDB
//       .find(searchQuery)
//       .sort({ price: -1 })
//       .skip(offset)
//       .limit(limit)
//       .populate("categoryId");

//     const currentDate = new Date();
//     const productsWithOffer = await Promise.all(
//       products.map((p) => computeOfferPrice(p.toObject(), currentDate))
//     );

//     const totalCount = await productDB.countDocuments(searchQuery);
//     const totalPages = Math.ceil(totalCount / limit);

//     res.json({
//       sortedProducts: productsWithOffer,
//       totalPages,
//       currentPage: page,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm,
//       descending: -1,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


// const priceSortDescending2 = async (req, res) => {
//   const { value, searchTerm } = req.body.value;
//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = value.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);
//   const categoryData = req.params.id.toUpperCase();
//   const page = parseInt(req.query.page) || 1;
//   const limit = 4;
//   const offset = (page - 1) * limit;

//   try {
//     const category = await CategoryDB.findOne({
//       name: categoryData,
//       isAvailable: true,
//     });
//     if (!category) throw new Error("Category not found");

//     const searchQuery = {
//       categoryId: category._id,
//       price: { $gte: minValue, $lte: maxValue },
//       isAvailable: true,
//       ...(searchTerm && { name: { $regex: searchTerm, $options: "i" } }),
//     };

//     const products = await productDB
//       .find(searchQuery)
//       .sort({ price: -1 }) // Sorts by original price
//       .skip(offset)
//       .limit(limit)
//       .populate("categoryId");

//     const currentDate = new Date();
    
//     // Compute offerPrice dynamically matching productListUser logic
//     const productsWithOffer = await Promise.all(
//       products.map(async (product) => {
//         const categoryDiscount = product.categoryId.discountPercentage || 0;
//         let offerPrice = product.price;
//         let applyCategoryDiscount = true;

//         if (
//           product.discountPercentage &&
//           (!product.expiryDate || currentDate <= product.expiryDate)
//         ) {
//           offerPrice -= (offerPrice * product.discountPercentage) / 100;
//           applyCategoryDiscount = false;
//         }

//         if (applyCategoryDiscount) {
//           if (product.categoryId.startDate && product.categoryId.endDate) {
//             const startDate = new Date(product.categoryId.startDate);
//             const endDate = new Date(product.categoryId.endDate);
//             if (currentDate >= startDate && currentDate <= endDate) {
//               offerPrice -= (offerPrice * categoryDiscount) / 100;
//             }
//           } else {
//             offerPrice -= (offerPrice * categoryDiscount) / 100;
//           }
//         }

//         return {
//           ...product.toObject(),
//           offerPrice,
//           normalPrice: product.price,
//         };
//       })
//     );

//     const totalCount = await productDB.countDocuments(searchQuery);
//     const totalPages = Math.ceil(totalCount / limit);

//     res.json({
//       sortedProducts: productsWithOffer,
//       totalPages,
//       currentPage: page,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm,
//       descending: -1,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


// const priceSortAscending2 = async (req, res) => {
//   const { value, searchTerm } = req.body.value;
//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = value.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);
//   const categoryData = req.params.id.toUpperCase();
//   const page = parseInt(req.query.page) || 1;
//   const limit = 4;
//   const offset = (page - 1) * limit;

//   try {
//     const category = await CategoryDB.findOne({
//       name: categoryData,
//       isAvailable: true,
//     });
//     if (!category) throw new Error("Category not found");

//     // Change exact match to case-insensitive partial match regex
//     const searchQuery = {
//       categoryId: category._id,
//       price: { $gte: minValue, $lte: maxValue },
//       isAvailable: true,
//       ...(searchTerm && { name: { $regex: searchTerm, $options: "i" } }),
//     };

//     const products = await productDB
//       .find(searchQuery)
//       .sort({ price: 1 })
//       .skip(offset)
//       .limit(limit)
//       .populate("categoryId");

//     const currentDate = new Date();
//     const productsWithOffer = await Promise.all(
//       products.map((p) => computeOfferPrice(p.toObject(), currentDate))
//     );

//     const totalCount = await productDB.countDocuments(searchQuery);
//     const totalPages = Math.ceil(totalCount / limit);

//     res.json({
//       sortedProducts: productsWithOffer,
//       totalPages,
//       currentPage: page,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


// const priceSortAscending2 = async (req, res) => {
//   const { value, searchTerm } = req.body.value;
//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = value.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);
//   const categoryData = req.params.id.toUpperCase();
//   const page = parseInt(req.query.page) || 1;
//   const limit = 4;
//   const offset = (page - 1) * limit;

//   try {
//     const category = await CategoryDB.findOne({
//       name: categoryData,
//       isAvailable: true,
//     });
//     if (!category) throw new Error("Category not found");

//     const searchQuery = {
//       categoryId: category._id,
//       price: { $gte: minValue, $lte: maxValue },
//       isAvailable: true,
//       ...(searchTerm && { name: { $regex: searchTerm, $options: "i" } }),
//     };

//     const products = await productDB
//       .find(searchQuery)
//       .sort({ price: 1 }) // Sorts by original price
//       .skip(offset)
//       .limit(limit)
//       .populate("categoryId");

//     const currentDate = new Date();

//     // Compute offerPrice dynamically matching productListUser logic
//     const productsWithOffer = await Promise.all(
//       products.map(async (product) => {
//         const categoryDiscount = product.categoryId.discountPercentage || 0;
//         let offerPrice = product.price;
//         let applyCategoryDiscount = true;

//         if (
//           product.discountPercentage &&
//           (!product.expiryDate || currentDate <= product.expiryDate)
//         ) {
//           offerPrice -= (offerPrice * product.discountPercentage) / 100;
//           applyCategoryDiscount = false;
//         }

//         if (applyCategoryDiscount) {
//           if (product.categoryId.startDate && product.categoryId.endDate) {
//             const startDate = new Date(product.categoryId.startDate);
//             const endDate = new Date(product.categoryId.endDate);
//             if (currentDate >= startDate && currentDate <= endDate) {
//               offerPrice -= (offerPrice * categoryDiscount) / 100;
//             }
//           } else {
//             offerPrice -= (offerPrice * categoryDiscount) / 100;
//           }
//         }

//         return {
//           ...product.toObject(),
//           offerPrice,
//           normalPrice: product.price,
//         };
//       })
//     );

//     const totalCount = await productDB.countDocuments(searchQuery);
//     const totalPages = Math.ceil(totalCount / limit);

//     res.json({
//       sortedProducts: productsWithOffer,
//       totalPages,
//       currentPage: page,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };





const priceSortDescending2 = async (req, res) => {
  const { value, searchTerm } = req.body.value;
  const regex = /₹(\d+)\s*-\s*₹(\d+)/;
  const match = value.match(regex);
  const minValue = parseInt(match[1], 10);
  const maxValue = parseInt(match[2], 10);
  const categoryData = req.params.id.toUpperCase();
  const page = parseInt(req.query.page) || 1;
  const limit = 4;

  try {
    const category = await CategoryDB.findOne({ name: categoryData, isAvailable: true });
    if (!category) throw new Error("Category not found");

    // Fetch ALL matching products (no price filter yet, no skip/limit)
    const searchQuery = {
      categoryId: category._id,
      isAvailable: true,
      ...(searchTerm && { name: { $regex: searchTerm, $options: "i" } }),
    };

    const products = await productDB.find(searchQuery).populate("categoryId");

    const currentDate = new Date();

    // Compute offerPrice for all products
    const productsWithOffer = products.map((product) => {
      const categoryDiscount = product.categoryId.discountPercentage || 0;
      let offerPrice = product.price;
      let applyCategoryDiscount = true;

      if (product.discountPercentage && (!product.expiryDate || currentDate <= product.expiryDate)) {
        offerPrice -= (offerPrice * product.discountPercentage) / 100;
        applyCategoryDiscount = false;
      }

      if (applyCategoryDiscount) {
        if (product.categoryId.startDate && product.categoryId.endDate) {
          const startDate = new Date(product.categoryId.startDate);
          const endDate = new Date(product.categoryId.endDate);
          if (currentDate >= startDate && currentDate <= endDate) {
            offerPrice -= (offerPrice * categoryDiscount) / 100;
          }
        } else {
          offerPrice -= (offerPrice * categoryDiscount) / 100;
        }
      }

      return { ...product.toObject(), offerPrice, normalPrice: product.price };
    });

    // Filter by offerPrice range, sort by offerPrice, then paginate
    const filtered = productsWithOffer
      .filter((p) => p.offerPrice >= minValue && p.offerPrice <= maxValue)
      .sort((a, b) => b.offerPrice - a.offerPrice); // descending

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    res.json({
      sortedProducts: paginated,
      totalPages,
      currentPage: page,
      categoryData,
      minValue,
      maxValue,
      searchTerm,
      descending: -1,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const priceSortAscending2 = async (req, res) => {
  const { value, searchTerm } = req.body.value;
  const regex = /₹(\d+)\s*-\s*₹(\d+)/;
  const match = value.match(regex);
  const minValue = parseInt(match[1], 10);
  const maxValue = parseInt(match[2], 10);
  const categoryData = req.params.id.toUpperCase();
  const page = parseInt(req.query.page) || 1;
  const limit = 4;

  try {
    const category = await CategoryDB.findOne({ name: categoryData, isAvailable: true });
    if (!category) throw new Error("Category not found");

    const searchQuery = {
      categoryId: category._id,
      isAvailable: true,
      ...(searchTerm && { name: { $regex: searchTerm, $options: "i" } }),
    };

    const products = await productDB.find(searchQuery).populate("categoryId");

    const currentDate = new Date();

    const productsWithOffer = products.map((product) => {
      const categoryDiscount = product.categoryId.discountPercentage || 0;
      let offerPrice = product.price;
      let applyCategoryDiscount = true;

      if (product.discountPercentage && (!product.expiryDate || currentDate <= product.expiryDate)) {
        offerPrice -= (offerPrice * product.discountPercentage) / 100;
        applyCategoryDiscount = false;
      }

      if (applyCategoryDiscount) {
        if (product.categoryId.startDate && product.categoryId.endDate) {
          const startDate = new Date(product.categoryId.startDate);
          const endDate = new Date(product.categoryId.endDate);
          if (currentDate >= startDate && currentDate <= endDate) {
            offerPrice -= (offerPrice * categoryDiscount) / 100;
          }
        } else {
          offerPrice -= (offerPrice * categoryDiscount) / 100;
        }
      }

      return { ...product.toObject(), offerPrice, normalPrice: product.price };
    });

    // Filter by offerPrice range, sort by offerPrice, then paginate
    const filtered = productsWithOffer
      .filter((p) => p.offerPrice >= minValue && p.offerPrice <= maxValue)
      .sort((a, b) => a.offerPrice - b.offerPrice); // ascending

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    res.json({
      sortedProducts: paginated,
      totalPages,
      currentPage: page,
      categoryData,
      minValue,
      maxValue,
      searchTerm,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// const searchProduct = async (req, res) => {
//   const categoryData = req.params.id.toUpperCase();
//   const searchValue = req.body.searchTerm;
//   const priceString = req.body.value;
//   const regex = /₹(\d+)\s*-\s*₹(\d+)/;
//   const match = priceString.match(regex);
//   const minValue = parseInt(match[1], 10);
//   const maxValue = parseInt(match[2], 10);
//   const page = parseInt(req.query.page) || 1;
//   const limit = 4;
//   const offset = (page - 1) * limit;

//   try {
//     const category = await CategoryDB.findOne({
//       name: categoryData,
//       isAvailable: true,
//     });
//     if (!category) throw new Error("Category not found");

//     const products = await productDB
//       .find({
//         categoryId: category._id,
//         price: { $gte: minValue, $lte: maxValue },
//         isAvailable: true,
//         name: { $regex: searchValue, $options: "i" },
//       })
//       .sort({ price: 1 })
//       .skip(offset)
//       .limit(limit)
//       .populate("categoryId");

//     const currentDate = new Date();
//     const productsWithOffer = await Promise.all(
//       products.map((p) => computeOfferPrice(p.toObject(), currentDate))
//     );

//     const totalCount = await productDB.countDocuments({
//       categoryId: category._id,
//       price: { $gte: minValue, $lte: maxValue },
//       isAvailable: true,
//       name: { $regex: searchValue, $options: "i" },
//     });

//     const totalPages = Math.ceil(totalCount / limit);

//     res.json({
//       searchProducts: productsWithOffer,
//       totalPages,
//       currentPage: page,
//       categoryData,
//       minValue,
//       maxValue,
//       searchTerm: searchValue,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


const searchProduct = async (req, res) => {
  const categoryData = req.params.id.toUpperCase();
  const searchValue = req.body.searchTerm;
  const priceString = req.body.value;
  const regex = /₹(\d+)\s*-\s*₹(\d+)/;
  const match = priceString.match(regex);
  const minValue = parseInt(match[1], 10);
  const maxValue = parseInt(match[2], 10);
  const page = parseInt(req.query.page) || 1;
  const limit = 4;
  const sortOrder = req.body.sortOrder || "asc"; // 'asc' or 'desc'

  try {
    const category = await CategoryDB.findOne({
      name: categoryData,
      isAvailable: true,
    });
    if (!category) throw new Error("Category not found");

    // Fetch all matching products without price filter, sort, or pagination
    const products = await productDB
      .find({
        categoryId: category._id,
        isAvailable: true,
        name: { $regex: searchValue, $options: "i" },
      })
      .populate("categoryId");

    const currentDate = new Date();

    // Compute offer price for every product
    const productsWithOffer = products.map((product) => {
      const categoryDiscount = product.categoryId.discountPercentage || 0;
      let offerPrice = product.price;
      let applyCategoryDiscount = true;

      if (
        product.discountPercentage &&
        (!product.expiryDate || currentDate <= product.expiryDate)
      ) {
        offerPrice -= (offerPrice * product.discountPercentage) / 100;
        applyCategoryDiscount = false;
      }

      if (applyCategoryDiscount) {
        if (product.categoryId.startDate && product.categoryId.endDate) {
          const startDate = new Date(product.categoryId.startDate);
          const endDate = new Date(product.categoryId.endDate);
          if (currentDate >= startDate && currentDate <= endDate) {
            offerPrice -= (offerPrice * categoryDiscount) / 100;
          }
        } else {
          offerPrice -= (offerPrice * categoryDiscount) / 100;
        }
      }

      return {
        ...product.toObject(),
        offerPrice,
        normalPrice: product.price,
      };
    });

    // Filter by offer price range
    const filtered = productsWithOffer.filter(
      (p) => p.offerPrice >= minValue && p.offerPrice <= maxValue
    );

    // Sort by offer price
    filtered.sort((a, b) =>
      sortOrder === "desc"
        ? b.offerPrice - a.offerPrice
        : a.offerPrice - b.offerPrice
    );

    // Paginate in memory
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    res.json({
      searchProducts: paginated,
      totalPages,
      currentPage: page,
      categoryData,
      minValue,
      maxValue,
      searchTerm: searchValue,
      sortOrder,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  addProduct,
  productadded,
  productListAdmin,
  productListUser,
  productUnlist,
  productDelete,
  productList,
  productUpdate,
  productUpdatePost,
  productImgDelete,
  productDetail,
  priceSortAscending,
  priceSortDescending,
  searchProduct,
  fetchData,
  // new update
  priceSortAscending2,
  priceSortDescending2,
};
