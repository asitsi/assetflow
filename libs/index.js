const BASEURL =  process.env.NEXT_PUBLIC_BASEURL;

// game upload
export const uploadGame = async (formData) => {
    const response = await fetch(`${BASEURL}/createNewGame`, {
      method: 'POST',
      body: formData
    })
    return response.json()
  }
  
  // limitless image upload
  export const limitlessImageUpload = async (formData) => {
    // When sending FormData, DO NOT set Content-Type. The browser will set it, including boundaries.
    console.log("formData", formData.has('image'));
    const response = await fetch(`${BASEURL}/limitlessImageUpload`, {
      method: 'POST',
      body: formData,
      // No headers needed for multipart/form-data with FormData
    });
    return response.json();
  }
  
  // get all images
  export const getLimitlessImages = async () => {
    const response = await fetch(`${BASEURL}/getLimitlessImages`, {
      method: 'GET',
    });
    return response.json();
  }

  // delete image
  export const deleteLimitlessImage = async (imageKitId) => {
    const response = await fetch(`${BASEURL}/deleteLimitlessImage`, {
      method: 'POST',
      body: JSON.stringify({ imageKitId: imageKitId }),
    });
    return response.json();
  }
