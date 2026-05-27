package com.Rarick.inventoryapp;

import android.provider.BaseColumns;

/**
 * Created by rarick on 3/26/2017.
 */
public final class DBContract {

    private static final String TEXT_TYPE = " TEXT ";
    private static final String COMMA_SEP = " , ";

    // To prevent someone from accidentally instantiating the contract class,
    // give it an empty constructor.
    private DBContract() {
    }

    public static abstract class Table1 implements BaseColumns {

        // Contacts table name
        public static final String TABLE_NAME = "inventory";
        // Contacts Table Columns names
        public static final String KEY_ID = "id";
        public static final String KEY_TITLE = "title";
        public static final String KEY_QUANTITY = "quantity";
        public static final String KEY_PRICE = "price";
        public static final String KEY_IMAGE = "image";


        public static final String CREATE_TABLE = "CREATE TABLE " +
                TABLE_NAME + " (" +
                KEY_ID + " INTEGER PRIMARY KEY," +
                KEY_TITLE + TEXT_TYPE + COMMA_SEP +
                KEY_QUANTITY + " INTEGER " + COMMA_SEP +
                KEY_PRICE + " REAL" + COMMA_SEP +
                KEY_IMAGE + TEXT_TYPE +
                " )";

        public static final String DELETE_TABLE = "DROP TABLE IF EXISTS " + TABLE_NAME;
    }
}