package com.Rarick.inventoryapp;

import android.content.ContextWrapper;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;

public class ItemFullDisplayActivity extends AppCompatActivity {
    public static double priceProduct;
    public int rowID;
    public Inventory inv = new Inventory();
    int quantity = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_item_full_display);
        TextView name = (TextView) findViewById(R.id.productName);
//        TextView descrition = (TextView)findViewById(R.id.productDesc);
        TextView price = (TextView) findViewById(R.id.productPrice);
        TextView quantity = (TextView) findViewById(R.id.productQuantity);
        quantity.setText("0");

        // Get data passed in from Fragment
        Intent details = getIntent();
        setTitle(details.getStringExtra("productName"));


        name.setText(details.getStringExtra("productName"));
        int id  = details.getIntExtra("id",0);
        ContextWrapper cw = new ContextWrapper(this);
        File dir = cw.getFilesDir();
        // Load the item image
        DBHandler db = new DBHandler(this);
        String imageLocationDir = dir.toString();
        rowID = details.getIntExtra("id", 0) - 1;
        String imagePath = imageLocationDir + "/" + rowID;
        Log.v("Image path: ","After click Item"+imagePath);

        ImageView imageView = (ImageView) findViewById(R.id.imgIcon);

        Bitmap bitmap = BitmapFactory.decodeFile(imagePath);
        // Set the image view
        imageView.setImageBitmap(bitmap);

        quantity.setText("" + details.getIntExtra("productQuantity", 0));
        priceProduct = details.getDoubleExtra("productPrice", 0.0);
        price.setText("" + priceProduct);


    }

    public void quantityIncrement(View view) {
        if (quantity == 100) {
            return;
        }
        quantity = quantity + 1;
        displayQuantity(quantity);
    }

    public void quantityDecrement(View view) {
        if (quantity == 0) {
            return;
        }
        quantity = quantity - 1;
        displayQuantity(quantity);
    }

    public void onClickDelete(final View view) {

        new AlertDialog.Builder(this)
                .setTitle("Warning")
                .setMessage("Are you sure you want to delete this record permanently?")
                .setPositiveButton("Yes", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        deleteItemPermanently(rowID);
                        Toast.makeText(view.getContext(), "Deleted Successfully", Toast.LENGTH_SHORT).show();
//                        finish();
                        Intent intent = new Intent(view.getContext(), MainActivity.class);
                        view.getContext().startActivity(intent);
                    }

                })
                .setNegativeButton("No", null)
                .show();
    }

    public void deleteItemPermanently(int rowID) {
        DBHandler db = new DBHandler(this);
        db.deleteHabitRow(rowID);

    }

    public void onSubmitMore(View view) {

        String subject = "URGENT: ORDER MORE ITEMS";
        String message = "Product Name: " + inv.getProductName() +
                "\nProduct Price: " + inv.getPrice() +
                "\nQuantity To be ordered: " + quantity +
                "\n\nI need this item asap :)" +
                "\n\nThanks,\nSamsruti";
        Log.v("Message:", message);
        String[] emails = {"workOrderMore@gmail.com"};

        Intent intent = new Intent(Intent.ACTION_SENDTO);
        intent.setData(Uri.parse("mailto:")); // only email apps should handle this
        intent.putExtra(Intent.EXTRA_EMAIL, emails);
        intent.putExtra(Intent.EXTRA_SUBJECT, subject);
        intent.putExtra(Intent.EXTRA_TEXT, message);
        if (intent.resolveActivity(getPackageManager()) != null) {
            startActivity(intent);
        }
    }

    private void displayQuantity(int count) {
        TextView quantity = (TextView) findViewById(R.id.quantity);
        quantity.setText("" + count);

    }
}