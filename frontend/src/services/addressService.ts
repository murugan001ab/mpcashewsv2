// src/services/addressService.ts
import { getData, postData, deleteData, putData } from "./api";

export interface Address {
  id: string | number;
  name: string;
  phone_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

export const getAddresses      = (_token?: string): Promise<Address[]>  => getData<Address[]>("addresses/");
export const addAddress        = (_token: string | undefined, data: Omit<Address, "id">): Promise<Address> =>
  postData<Address>("addresses/", data);
export const updateAddress     = (_token: string | undefined, id: string | number, data: Partial<Address>): Promise<Address> =>
  putData<Address>(`addresses/${id}`, data);
export const deleteAddressById = (_token: string | undefined, id: string | number): Promise<unknown> =>
  deleteData(`addresses/${id}`);
