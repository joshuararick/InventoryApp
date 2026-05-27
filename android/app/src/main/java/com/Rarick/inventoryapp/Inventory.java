package com.Rarick.inventoryapp;

/**
 * Created by rarick on 3/26/2017.
 */
public class Inventory {
    private int id;
    private String productName;
    private int quantity;
    private double price;

    public Inventory() {
        super();
    }

    public Inventory(String productName, int quantity, double price) {
        super();
        this.productName = productName;
        this.quantity = quantity;
        this.price = price;

    }

    public int getProductId() {
        return this.id;
    }

    public String getProductName() {
        return this.productName;
    }

    public void setProductName(String name) {
        this.productName = name;
    }
    public double getPrice() {
        return this.price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getQuantity() {
        return this.quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    //Setters
    public void setProductID(int id) {
        this.id = id;
    }

    public void quantitySale() {
        this.quantity = this.quantity - 1;
        if (this.quantity < 0) {
            this.quantity = 0;
        }


    }

    @Override
    public String toString() {
        return "You are lucky :)\n" + getProductName() + " " + getPrice() + " " + getQuantity();
    }
}
