package com.Rarick.inventoryapp;

import android.content.Intent;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.View;
import android.widget.ListView;
import android.widget.TextView;

import java.util.ArrayList;

/**
 *
 */
public class MainActivity extends AppCompatActivity {
    ListView list;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        DBHandler db = new DBHandler(this);
        Log.v("DB", "OK");
        Log.v("QUERY:", DBContract.Table1.CREATE_TABLE);


        ListView listView = (ListView) findViewById(R.id.listView);
        // Inserting
        TextView empty = (TextView) findViewById(R.id.empty);


        ArrayList<com.Rarick.inventoryapp.Inventory> listArray = db.readInventory();
        if (listArray.size() == 0) {
            empty.setText("No Items in the Inventory :(");
        } else {
            empty.setText("");
        }
//        db.addItem(new Inventory("san",1,4,"Okk"));
        Log.v("Size : ", String.valueOf(listArray.size()));
        for (com.Rarick.inventoryapp.Inventory H : listArray) {
            String log = "Id: " + H.getProductId() + " ,Title: " + H.getProductName();
//            "\nImage Path: "+H.getImagePath();
            // Writing Contacts to log
//            db.deleteHabitRow(H.getProductId());
            Log.d("Name: ", log);

        }

        ListViewAdapter customAdapter = new ListViewAdapter(listArray);
        customAdapter.notifyDataSetChanged();

        listView.setAdapter(customAdapter);
    }

    public void addNewItem(View view) {
        Intent intent = new Intent(this, AddNewItem.class);
        intent.putExtra("HEADER", "Add a New Item");
        startActivity(intent);
    }

}