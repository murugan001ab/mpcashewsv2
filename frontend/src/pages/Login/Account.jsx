import React, { useEffect, useState } from 'react';
import axios from 'axios';
// Assuming JWT is stored here
  
const Account = () => {
  const [userData, setUserData] = useState(null);
  const[loading,setLoading]=useState(false);
  const handleName=(e)=>{
    
    setUserData((preData)=>({...preData,username:e.target.value}));
  }

  const handleNameChange=async(e)=>{

    setLoading(true);
    const res=axios.post("http://localhost:8000/auth/update-user/",{
      
      username:userData.username,
    },{
      headers:{
        Authorization:`Bearer ${localStorage.getItem('accessToken')}`
      }
    }).then((res)=>{
      console.log(res.data);
    }).catch((err)=>{
      console.log(err);
    }).finally(()=>{
      setLoading(false);
    });
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      setLoading(true);
      axios.get('http://localhost:8000/auth/api/user-data/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(response => {
        // console.log(response.data);
        setUserData(response.data);
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, []);

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    
    <>

      {loading ? (
        <div>
          
          <Loder />

        </div>)
    :(<>
    <h1>Account</h1>    
      <h2>Account Details</h2>
      <p><strong>ID:</strong> {userData.id}</p>
      <p><strong>Username:</strong> <input type="text" name="username" onChange={(e)=>{handleName(e)}} value={userData.username} /></p>
      <button  onClick={handleNameChange} style={{width:"100px"}} >saveChange </button>
      <p><strong>Email:</strong> {userData.email}</p></>)
    }
</>
     
  );
};

export default Account;